import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const Body = z.object({
  items: z.array(z.string().uuid()).min(1),
  reasoning: z.string().optional(),
  confidence: z.number().optional(),
  is_saved: z.boolean().optional(),
  context: z.record(z.unknown()).optional(),
});

/** Record a worn outfit and bump wear history on its items. */
export async function POST(req: Request) {
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: 'Invalid body', details: String(e) }, { status: 400 });
  }

  const supa = createAdminClient();
  const now = new Date().toISOString();

  const { error: outfitErr } = await supa.from('outfits').insert({
    items: parsed.items,
    ai_reasoning: parsed.reasoning ?? null,
    confidence: parsed.confidence ?? null,
    worn_at: now,
    is_saved: parsed.is_saved ?? false,
    context: parsed.context ?? {},
  });
  if (outfitErr) {
    return NextResponse.json({ error: outfitErr.message }, { status: 500 });
  }

  // Bump times_worn / last_worn_at so the recency penalty rotates these out.
  const { data: rows, error: readErr } = await supa
    .from('items')
    .select('id, times_worn')
    .in('id', parsed.items);
  if (readErr) {
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }

  const results = await Promise.all(
    (rows ?? []).map((r) =>
      supa
        .from('items')
        .update({ times_worn: (r.times_worn ?? 0) + 1, last_worn_at: now })
        .eq('id', r.id)
    )
  );
  const updateErr = results.find((r) => r.error)?.error;
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, worn_at: now });
}
