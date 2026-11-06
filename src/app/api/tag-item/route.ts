import { NextResponse } from 'next/server';
import { z } from 'zod';
import { gemini, MODELS } from '@/lib/gemini';
import { TAG_PROMPT, TAG_SCHEMA, TAG_SYSTEM } from '@/lib/prompts';

export const runtime = 'nodejs';
export const maxDuration = 30;

const Body = z.object({
  image_base64: z.string().min(100),
  mime_type: z.string().default('image/jpeg'),
});

/**
 * Vision models to try, in order.
 *
 * Tagging used one model with nothing behind it. On 6 Nov 2026 Google's newest
 * Flash answered "high demand" (503) for minutes at a time, which would have
 * failed every photo he added. Flash-lite and 2.5 Flash read garment photos
 * fine and sit on separate capacity.
 */
const TAG_CHAIN = [MODELS.reasoning, 'gemini-flash-lite-latest', 'gemini-2.5-flash'];
/** Per model, and for the whole walk: inside the route's 30s with room to answer. */
const RUNG_MS = 12_000;
const BUDGET_MS = 27_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: 'Invalid body', details: String(e) }, { status: 400 });
  }

  const deadline = Date.now() + BUDGET_MS;
  const errors: string[] = [];

  for (const model of TAG_CHAIN) {
    const remaining = deadline - Date.now();
    if (remaining < 4_000) break;
    try {
      const result = await withTimeout(
        gemini().models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { mimeType: parsed.mime_type, data: parsed.image_base64 } },
                { text: TAG_PROMPT },
              ],
            },
          ],
          config: {
            systemInstruction: TAG_SYSTEM,
            responseMimeType: 'application/json',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            responseSchema: TAG_SCHEMA as any,
            temperature: 0.3,
          },
        }),
        Math.min(RUNG_MS, remaining)
      );
      return NextResponse.json(JSON.parse(result.text ?? ''));
    } catch (err) {
      errors.push(`${model}: ${(err instanceof Error ? err.message : String(err)).slice(0, 140)}`);
    }
  }

  console.error('[tag-item] every model failed:', errors);
  return NextResponse.json({ error: 'Tagging failed', details: errors.join(' | ') }, { status: 502 });
}
