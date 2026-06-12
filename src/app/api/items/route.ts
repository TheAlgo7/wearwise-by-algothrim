import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const Body = z.object({
  name: z.string().min(1),
  category_id: z.string().uuid(),
  image_url: z.string().url(),
  image_path: z.string(),
  primary_color: z.string().nullable().optional(),
  secondary_colors: z.array(z.string()).optional(),
  fit: z.string().nullable().optional(),
  sleeve_length: z.string().nullable().optional(),
  can_be_worn_open: z.boolean().optional(),
  material: z.array(z.string()).optional(),
  formality: z.number().int().min(1).max(5).optional(),
  vibe: z.array(z.string()).optional(),
  min_temp_c: z.number().nullable().optional(),
  max_temp_c: z.number().nullable().optional(),
  occasions: z.array(z.string()).optional(),
  notes: z.string().nullable().optional(),
});

/** Add a wardrobe item (writes go through the server — RLS keeps anon read-only). */
export async function POST(req: Request) {
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: 'Invalid body', details: String(e) }, { status: 400 });
  }

  const supa = createAdminClient();
  const { data, error } = await supa.from('items').insert(parsed).select('id').single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data.id });
}
