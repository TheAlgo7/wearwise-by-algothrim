/**
 * Multi-provider LLM client for outfit generation.
 * Priority: Groq (fastest free tier) → OpenRouter → Google Gemini
 */

interface ChatMessage { role: 'system' | 'user'; content: string; }

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
  });

  if (!res.ok) {
    const body = await res.text();
    throw Object.assign(new Error(body), { status: res.status });
  }

  const data = await res.json() as { choices: { message: { content: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from model');
  return content;
}

/** Try Groq, then OpenRouter, then Google Gemini. Throws only if all fail. */
export async function generateJSON(system: string, user: string): Promise<string> {
  const messages: ChatMessage[] = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
  const errors: string[] = [];

  // 1. Groq — fastest, generous free tier
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      return await openAICompatible(
        'https://api.groq.com/openai/v1',
        groqKey,
        'llama-3.3-70b-versatile',
        messages,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Groq: ${msg.slice(0, 120)}`);
      // 429 = rate limit, try next; anything else also falls through
    }
  }

  // 2. OpenRouter — free Gemini + Llama models
  const orKey = process.env.OPENROUTER_API_KEY;
  if (orKey) {
    for (const model of [
      'google/gemini-2.0-flash-exp:free',
      'meta-llama/llama-3.3-70b-instruct:free',
    ]) {
      try {
        return await openAICompatible(
          'https://openrouter.ai/api/v1',
          orKey,
          model,
          messages,
          'https://wearwise-by-algothrim.vercel.app',
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`OpenRouter(${model}): ${msg.slice(0, 120)}`);
      }
    }
  }

  // 3. Google Gemini — last resort (has daily quota limits)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: user }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.9 },
          }),
        },
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as {
        candidates: { content: { parts: { text: string }[] } }[];
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Empty Gemini response');
      return text;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Gemini: ${msg.slice(0, 120)}`);
    }
  }

  throw new Error(`All providers failed:\n${errors.join('\n')}`);
}
