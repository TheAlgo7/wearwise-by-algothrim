import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { getRole } from '@/lib/auth';
import { SEASONS } from '@/lib/season';

export const runtime = 'nodejs';

/**
 * Named looks: the saved shelf on /looks.
 *
 * Both roles may create one. Ishita's arrive tagged `created_by: 'partner'`
 * with a note, which is what turns a saved look into a pick on his home screen.
 * Only the owner may rename, reorder, or delete.
 */

const CreateBody = z.object({
  items: z.array(z.string().uuid()).min(1).max(12),
  name: z.string().trim().min(1).max(60).optional(),
  note: z.string().trim().max(280).optional(),
  reasoning: z.string().max(2000).optional(),
  confidence: z.number().min(0).max(1).optional(),
  season: z.enum(SEASONS).nullable().optional(),
  is_preset: z.boolean().optional(),
  context: z.record(z.unknown()).optional(),
});

export async function POST(req: Request) {
  const role = await getRole();

  let parsed;
  try {
    parsed = CreateBody.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: 'Invalid body', details: String(e) }, { status: 400 });
  }

  const supa = createAdminClient();
  const { data, error } = await supa
    .from('outfits')
    .insert({
      items: parsed.items,
      name: parsed.name ?? null,
      note: parsed.note ?? null,
      ai_reasoning: parsed.reasoning ?? null,
      confidence: parsed.confidence ?? null,
      season: parsed.season ?? null,
      is_saved: true,
      // A partner pick always lands on the shelf; the owner chooses.
      is_preset: role === 'partner' ? true : (parsed.is_preset ?? true),
      created_by: role,
      context: parsed.context ?? {},
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

const PatchBody = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(60).optional(),
  season: z.enum(SEASONS).nullable().optional(),
  sort_order: z.number().int().optional(),
  is_preset: z.boolean().optional(),
  /** Owner acknowledging one of Ishita's picks. */
  seen: z.boolean().optional(),
  reaction: z.string().trim().max(24).nullable().optional(),
});

export async function PATCH(req: Request) {
  const role = await getRole();

  let parsed;
  try {
    parsed = PatchBody.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: 'Invalid body', details: String(e) }, { status: 400 });
  }

  // Ishita can mark nothing but her own note; renaming and pinning are his.
  if (role !== 'owner') {
    return NextResponse.json({ error: 'Not your wardrobe to edit' }, { status: 403 });
  }

  const patch: Record<string, unknown> = {};
  if (parsed.name !== undefined) patch.name = parsed.name;
  if (parsed.season !== undefined) patch.season = parsed.season;
  if (parsed.sort_order !== undefined) patch.sort_order = parsed.sort_order;
  if (parsed.is_preset !== undefined) patch.is_preset = parsed.is_preset;
  if (parsed.seen) patch.seen_at = new Date().toISOString();
  if (parsed.reaction !== undefined) patch.reaction = parsed.reaction;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const supa = createAdminClient();
  const { error } = await supa.from('outfits').update(patch).eq('id', parsed.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const role = await getRole();
  if (role !== 'owner') {
    return NextResponse.json({ error: 'Not your wardrobe to edit' }, { status: 403 });
  }

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const supa = createAdminClient();
  const { error } = await supa.from('outfits').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
