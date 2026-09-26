/**
 * Multi-provider LLM client for outfit generation.
 *
 * Chain: Gemini flash-lite → Groq qwen3.8-27b → Gemini 2.5-flash
 *        → Groq gpt-oss-120b → OpenRouter nemotron (free)
 *
 * Each rung has independent rate limits, so rapid regenerations (the core
 * "tap until it's right" flow) degrade to a slower provider instead of failing.
 * The Groq rung retries once when its tokens-per-minute limit suggests a short
 * wait, which is cheaper than falling through to a slower provider.
 */

interface ChatMessage { role: 'system' | 'user'; content: string; }

const SITE = 'https://wearwise-by-algothrim.vercel.app';

/**
 * Time budget.
 *
 * The per-rung cap used to be 12s, which sounded generous but was measured
 * against a toy prompt. The real prompt carries the style blueprint plus ~26
 * tagged candidates, and every free-tier rung needs longer than that: in
 * testing, OpenRouter and Gemini aborted on timeout every single time while
 * answering the same request fine when given room. The chain was therefore
 * Groq-or-nothing, and a Groq rate limit meant a 502 for the user.
 *
 * Six rungs at the old cap also added up to 72s against the route's own 60s
 * maxDuration, so the chain could outlive the request that owned it. Rungs now
 * share one deadline and each gets whatever is left, so the walk always ends
 * with time to spare.
 */
const RUNG_TIMEOUT_MS = 20_000;
const TOTAL_BUDGET_MS = 48_000;
/** Starting a rung with less than this left is a guaranteed timeout. */
const MIN_RUNG_BUDGET_MS = 6_000;

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
  timeoutMs: number,
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
    signal: AbortSignal.timeout(timeoutMs),
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

async function gemini(
  apiKey: string,
  model: string,
  system: string,
  user: string,
  timeoutMs: number,
): Promise<string> {
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
      signal: AbortSignal.timeout(timeoutMs),
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

/**
 * Rungs are checked in order. Keep every slug current: they retire silently.
 *
 * Re-verified 2026-09-27 against each provider's live model list, with a
 * JSON-mode request. Groq retired all of its Llama models, so the old primary
 * (`llama-3.3-70b-versatile`) had been a 404 on every call and every outfit
 * was really coming from Gemini flash-lite. That is now the primary on purpose.
 * Groq's remaining chat models (gpt-oss-120b, gpt-oss-20b, qwen3.8-27b) are all
 * capped at 8,000 tokens a minute, tight for this prompt, so they sit behind
 * Gemini. OpenRouter dropped `openai/gpt-oss-20b:free`.
 */
const CHAIN: Rung[] = [
  // Gemini first: its own quota, quick, and it has been answering every
  // generation in production since the Groq Llama models were retired.
  { provider: 'gemini', model: 'gemini-flash-lite-latest' },
  // Groq's fastest JSON-clean model. A prompt over the 8k-a-minute budget
  // fails at once with 413 and the chain moves on without losing time.
  { provider: 'groq', model: 'qwen/qwen3.8-27b', retryOn429: true },
  { provider: 'gemini', model: 'gemini-2.5-flash' },
  { provider: 'groq', model: 'openai/gpt-oss-120b' },
  // Genuinely last resort: free OpenRouter capacity is queued and slow.
  { provider: 'openrouter', model: 'nvidia/nemotron-3-super-120b-a12b:free' },
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
  const deadline = Date.now() + TOTAL_BUDGET_MS;

  for (const rung of CHAIN) {
    const key =
      rung.provider === 'groq' ? process.env.GROQ_API_KEY :
      rung.provider === 'openrouter' ? process.env.OPENROUTER_API_KEY :
      process.env.GEMINI_API_KEY;
    if (!key) continue;

    const remaining = deadline - Date.now();
    if (remaining < MIN_RUNG_BUDGET_MS) {
      errors.push(`${rung.provider}(${rung.model}): skipped, out of time budget`);
      break;
    }
    const rungTimeout = Math.min(RUNG_TIMEOUT_MS, remaining);

    const attempt = () =>
      rung.provider === 'gemini'
        ? gemini(key, rung.model, system, user, rungTimeout)
        : openAICompatible(
            rung.provider === 'groq' ? 'https://api.groq.com/openai/v1' : 'https://openrouter.ai/api/v1',
            key,
            rung.model,
            messages,
            rungTimeout,
            rung.provider === 'openrouter' ? SITE : undefined,
          );

    try {
      return await attempt();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const status = (e as { status?: number }).status;

      // Short TPM waits on the primary are cheaper than slower fallbacks, but
      // only when sleeping still leaves room for the retry and a fallback.
      if ('retryOn429' in rung && rung.retryOn429 && status === 429) {
        const wait = suggestedWaitMs(msg);
        const affordable =
          wait !== null && deadline - Date.now() - wait > MIN_RUNG_BUDGET_MS * 2;
        if (wait !== null && wait <= MAX_429_WAIT_MS && affordable) {
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

      // A 404 means the model slug is gone, not that the service is busy. That
      // is a permanently dead rung and it stays invisible until every rung
      // fails, so say so loudly in the logs the first time it happens.
      if (status === 404) {
        console.warn(
          `[llm] rung ${rung.provider}/${rung.model} returned 404 — the model slug is probably retired. Update CHAIN in lib/llm.ts.`
        );
      }

      errors.push(`${rung.provider}(${rung.model}): ${msg.slice(0, 120)}`);
    }
  }

  throw new Error(`All providers failed:\n${errors.join('\n')}`);
}
