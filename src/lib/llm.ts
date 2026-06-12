/**
 * Multi-provider LLM client for outfit generation.
 *
 * Chain: Groq llama-3.3-70b → Groq gpt-oss-120b → OpenRouter gpt-oss-120b
 *        → OpenRouter llama-3.3-70b → Gemini flash-lite → Gemini 2.5-flash
 *
 * Each rung has independent rate limits, so rapid regenerations (the core
 * "tap until it's right" flow) degrade to a slower provider instead of failing.
 * The primary Groq rung retries once when its tokens-per-minute limit suggests
 * a short wait — cheaper than falling through to a slower provider.
 */

interface ChatMessage { role: 'system' | 'user'; content: string; }

const SITE = 'https://wearwise-by-algothrim.vercel.app';

// Per-provider cap so one hanging rung can't eat the route's time budget.
const RUNG_TIMEOUT_MS = 12_000;

/** Some models wrap JSON in markdown fences — strip them before parsing. */
function stripFences(text: string): string {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return (m ? m[1] : text).trim();
}

/** Parse "Please try again in 4.32s" out of a Groq 429 body. */
function suggestedWaitMs(body: string): number | null {
  const m = body.match(/try again in ([\d.]+)s/i);
  return m ? Math.ceil(parseFloat(m[1]) * 1000) : null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function openAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  referer?: string,
): Promise<string> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  if (referer) {
    headers['HTTP-Referer'] = referer;
    headers['X-Title'] = 'WearWise';
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.9,
    }),
    signal: AbortSignal.timeout(RUNG_TIMEOUT_MS),
  });

  if (!res.ok) {
    const body = await res.text();
    throw Object.assign(new Error(body), { status: res.status });
  }

  const data = await res.json() as { choices: { message: { content: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from model');
  return stripFences(content);
}

async function gemini(apiKey: string, model: string, system: string, user: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.9 },
      }),
      signal: AbortSignal.timeout(RUNG_TIMEOUT_MS),
    },
  );
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json() as {
    candidates: { content: { parts: { text: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');
  return stripFences(text);
}

type Rung =
  | { provider: 'groq' | 'openrouter'; model: string; retryOn429?: boolean }
  | { provider: 'gemini'; model: string };

const CHAIN: Rung[] = [
  { provider: 'groq', model: 'llama-3.3-70b-versatile', retryOn429: true },
  { provider: 'groq', model: 'openai/gpt-oss-120b' },
  { provider: 'openrouter', model: 'openai/gpt-oss-120b:free' },
  { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' },
  { provider: 'gemini', model: 'gemini-flash-lite-latest' },
  { provider: 'gemini', model: 'gemini-2.5-flash' },
];

// Don't stall the user past this even if the provider asks for a longer wait.
const MAX_429_WAIT_MS = 6_000;

/** Walk the provider chain. Throws only if every rung fails. */
export async function generateJSON(system: string, user: string): Promise<string> {
  const messages: ChatMessage[] = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
  const errors: string[] = [];

  for (const rung of CHAIN) {
    const key =
      rung.provider === 'groq' ? process.env.GROQ_API_KEY :
      rung.provider === 'openrouter' ? process.env.OPENROUTER_API_KEY :
      process.env.GEMINI_API_KEY;
    if (!key) continue;

    const attempt = () =>
      rung.provider === 'gemini'
        ? gemini(key, rung.model, system, user)
        : openAICompatible(
            rung.provider === 'groq' ? 'https://api.groq.com/openai/v1' : 'https://openrouter.ai/api/v1',
            key,
            rung.model,
            messages,
            rung.provider === 'openrouter' ? SITE : undefined,
          );

    try {
      return await attempt();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const status = (e as { status?: number }).status;

      // Short TPM waits on the primary are cheaper than slower fallbacks.
      if ('retryOn429' in rung && rung.retryOn429 && status === 429) {
        const wait = suggestedWaitMs(msg);
        if (wait !== null && wait <= MAX_429_WAIT_MS) {
          await sleep(wait);
          try {
            return await attempt();
          } catch (e2) {
            const msg2 = e2 instanceof Error ? e2.message : String(e2);
            errors.push(`${rung.provider}(${rung.model}, retried): ${msg2.slice(0, 120)}`);
            continue;
          }
        }
      }

      errors.push(`${rung.provider}(${rung.model}): ${msg.slice(0, 120)}`);
    }
  }

  throw new Error(`All providers failed:\n${errors.join('\n')}`);
}
