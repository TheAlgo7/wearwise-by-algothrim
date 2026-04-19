import { NextResponse } from 'next/server';
import { z } from 'zod';
import { gemini, MODELS } from '@/lib/gemini';
import { CLEAN_IMAGE_PROMPT } from '@/lib/prompts';

export const runtime = 'nodejs';
export const maxDuration = 60;

const Body = z.object({
  image_base64: z.string().min(100),
  mime_type: z.string().default('image/jpeg'),
});

/**
 * Background removal using Gemini 2.5 Flash Image (a.k.a. "Nano Banana 2").
 * Input: photo as base64.
 * Output: { image_base64, mime_type } of the cleaned image, ready to upload
 * to Supabase Storage.
 */
export async function POST(req: Request) {
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: 'Invalid body', details: String(e) }, { status: 400 });
  }

  try {
    const result = await gemini().models.generateContent({
      model: MODELS.image,
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: parsed.mime_type, data: parsed.image_base64 } },
            { text: CLEAN_IMAGE_PROMPT },
          ],
        },
      ],
    });

    // Find the image inlineData in the response parts.
    const parts = result.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p) => 'inlineData' in p && p.inlineData);
    if (!imagePart || !('inlineData' in imagePart) || !imagePart.inlineData) {
      return NextResponse.json(
        { error: 'Model returned no image', raw_text: result.text },
        { status: 502 }
      );
    }

    return NextResponse.json({
      image_base64: imagePart.inlineData.data,
      mime_type: imagePart.inlineData.mimeType ?? 'image/png',
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Clean-image failed', details: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }
}
