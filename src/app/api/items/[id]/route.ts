import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const Patch = z.object({
  archived: z.boolean(),
});

type Params = { params: Promise<{ id: string }> };

/** Toggle archive state. */
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  let parsed;
  try {
    parsed = Patch.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: 'Invalid body', details: String(e) }, { status: 400 });
  }

  const supa = createAdminClient();
  const { error } = await supa.from('items').update(parsed).eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** Delete an item and its storage image. */
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const supa = createAdminClient();

  const { data: item } = await supa.from('items').select('image_path').eq('id', id).maybeSingle();
  if (item?.image_path) {
    await supa.storage.from('items').remove([item.image_path]);
  }

  const { error } = await supa.from('items').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
