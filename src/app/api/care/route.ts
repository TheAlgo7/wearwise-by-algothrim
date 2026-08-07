import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { isOwner } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { buildCarePlan, type CareContext } from '@/lib/care/engine';
import type { CareLog, CareProduct, CareProfile } from '@/lib/care/types';

/**
 * Care data never touches the browser's Supabase key.
 *
 * The `care_*` tables have RLS on and no policies at all, so the publishable
 * key cannot read a single row of them. That is deliberate: Ishita's browser
 * holds that key, and shaving, intimate grooming and skin reactions are not
 * hers to read. Everything here goes through the service-role client, behind
 * an owner check, on the server.
 *
 * If a client component ever needs care data, it asks this route. It does not
 * get a policy.
 */

const LOG_ACTIONS = [
  'cleanse', 'soothe', 'treat', 'moisturise', 'sunscreen',
  'shampoo', 'condition', 'style', 'body_wash', 'exfoliate',
  'shave', 'trim', 'haircut', 'hair_spa', 'reaction',
] as const;

const logSchema = z.object({
  action: z.enum(LOG_ACTIONS),
  domain: z.enum(['skin', 'hair', 'body']),
  area: z.string().max(40).nullish(),
  product_id: z.string().uuid().nullish(),
  note: z.string().max(500).nullish(),
  severity: z.number().int().min(1).max(3).nullish(),
});

const profilePatchSchema = z.object({
  dandruff: z.enum(['active', 'occasional', 'none']).optional(),
  skin_type: z.string().max(40).optional(),
  hairstyle_goal: z.string().max(200).optional(),
  share_with_partner: z.boolean().optional(),
});

async function guard() {
  if (await isOwner()) return null;
  return NextResponse.json({ error: 'Not your routine' }, { status: 403 });
}

/** Logs older than this cannot influence any cadence the engine computes. */
const LOG_WINDOW_DAYS = 120;

export async function GET(req: NextRequest) {
  const denied = await guard();
  if (denied) return denied;

  const supa = createAdminClient();
  const since = new Date(Date.now() - LOG_WINDOW_DAYS * 86_400_000).toISOString();

  const [{ data: profileRows, error: pErr }, { data: products, error: prErr }, { data: logs, error: lErr }] =
    await Promise.all([
      supa.from('care_profile').select('*').limit(1),
      supa.from('care_products').select('*').eq('archived', false).order('domain').order('step_order', { nullsFirst: false }),
      supa.from('care_logs').select('*').gte('done_at', since).order('done_at', { ascending: false }),
    ]);

  if (pErr || prErr || lErr) {
    return NextResponse.json(
      { error: 'Could not read your care data', details: (pErr ?? prErr ?? lErr)?.message },
      { status: 500 }
    );
  }

  const profile = (profileRows?.[0] ?? null) as CareProfile | null;
  if (!profile) {
    return NextResponse.json({ error: 'No care profile set up yet' }, { status: 404 });
  }

  const q = req.nextUrl.searchParams;
  const num = (k: string) => {
    const v = q.get(k);
    if (v === null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const ctx: CareContext = {
    mode: q.get('mode') ?? 'casual',
    environment: q.get('environment') === 'indoor-ac' ? 'indoor-ac' : 'outdoor',
    plannedFor:
      q.get('planned_for') === 'tonight' ? 'tonight'
      : q.get('planned_for') === 'tomorrow' ? 'tomorrow'
      : 'now',
    tempC: num('temp_c'),
    humidity: num('humidity'),
    condition: q.get('condition'),
  };

  // Dev-only clock override. The evening branch, the post-shave rule and the
  // event-tomorrow rule are the ones worth getting right, and none of them can
  // be exercised at 10am without it. Never honoured in production.
  const at = process.env.NODE_ENV !== 'production' ? req.nextUrl.searchParams.get('at') : null;
  const now = at && !Number.isNaN(Date.parse(at)) ? new Date(at) : new Date();

  const p = (products ?? []) as CareProduct[];
  const l = (logs ?? []) as CareLog[];

  // Both routines, always. The screen shows what is due now and what is due
  // tonight side by side rather than making him come back at 10pm to find out.
  const plan = buildCarePlan(profile, p, l, ctx, now);
  const morning = plan.phase === 'morning' ? plan : buildCarePlan(profile, p, l, ctx, now, 'morning');
  const evening = plan.phase === 'evening' ? plan : buildCarePlan(profile, p, l, ctx, now, 'evening');

  return NextResponse.json({
    plan,
    morning,
    evening,
    profile,
    products: products ?? [],
    logs: l.slice(0, 60),
  });
}

export async function POST(req: NextRequest) {
  const denied = await guard();
  if (denied) return denied;

  const parsed = logSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid log', details: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const supa = createAdminClient();
  const { data, error } = await supa
    .from('care_logs')
    .insert({
      action: parsed.data.action,
      domain: parsed.data.domain,
      area: parsed.data.area ?? null,
      product_id: parsed.data.product_id ?? null,
      note: parsed.data.note ?? null,
      severity: parsed.data.severity ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Could not log that', details: error.message }, { status: 500 });
  }
  return NextResponse.json({ log: data });
}

export async function PATCH(req: NextRequest) {
  const denied = await guard();
  if (denied) return denied;

  const parsed = profilePatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const supa = createAdminClient();
  const { data: existing } = await supa.from('care_profile').select('id').limit(1).single();
  if (!existing) return NextResponse.json({ error: 'No care profile' }, { status: 404 });

  const { data, error } = await supa
    .from('care_profile')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', existing.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Could not save that', details: error.message }, { status: 500 });
  }
  return NextResponse.json({ profile: data });
}

/** Undo the most recent log for an action today, for a mis-tap. */
export async function DELETE(req: NextRequest) {
  const denied = await guard();
  if (denied) return denied;

  const action = req.nextUrl.searchParams.get('action');
  if (!action || !(LOG_ACTIONS as readonly string[]).includes(action)) {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  const supa = createAdminClient();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const { data: recent } = await supa
    .from('care_logs')
    .select('id')
    .eq('action', action)
    .gte('done_at', startOfToday.toISOString())
    .order('done_at', { ascending: false })
    .limit(1);

  const id = recent?.[0]?.id;
  if (!id) return NextResponse.json({ error: 'Nothing logged for that today' }, { status: 404 });

  const { error } = await supa.from('care_logs').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: 'Could not undo that', details: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
