import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

const Body = z.object({
  image_base64: z.string().min(100),
  mime_type: z.string().default('image/png'),
  filename_hint: z.string().optional(),
});

/** Upload a base64 image to Supabase Storage `items` bucket, return public URL. */
export async function POST(req: Request) {
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: 'Invalid body', details: String(e) }, { status: 400 });
  }

  const supa = createAdminClient();
  const ext = parsed.mime_type.split('/')[1] ?? 'png';
  const safeHint = (parsed.filename_hint ?? 'item')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  const path = `wardrobe/${Date.now()}-${safeHint || 'item'}.${ext}`;

  const buffer = Buffer.from(parsed.image_base64, 'base64');

  const { error } = await supa.storage.from('items').upload(path, buffer, {
    contentType: parsed.mime_type,
    upsert: false,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: pub } = supa.storage.from('items').getPublicUrl(path);

  return NextResponse.json({
    path,
    public_url: pub.publicUrl,
  });
}
