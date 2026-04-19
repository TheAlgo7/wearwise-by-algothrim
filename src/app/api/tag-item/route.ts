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

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: 'Invalid body', details: String(e) }, { status: 400 });
  }

  try {
    const result = await gemini().models.generateContent({
      model: MODELS.reasoning,
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
    });

    const text = result.text ?? '';
    const json = JSON.parse(text);
    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json(
      { error: 'Tagging failed', details: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }
}
