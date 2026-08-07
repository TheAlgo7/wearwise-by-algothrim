import { NextResponse } from 'next/server';
import { getRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * The one slice of Care that Ishita is allowed to see.
 *
 * Deliberately its own route rather than a branch inside /api/care: that path
 * is blocked wholesale for the partner role in proxy.ts, and carving an
 * exception into a prefix rule is exactly how a private endpoint accidentally
 * becomes public. This one starts from nothing and adds only grooming timing.
 *
 * Never returns products, routines, skin logs, reactions or photos. If the
 * owner has not turned sharing on, the partner gets `{ enabled: false }` and
 * no data at all.
 */

const GROOMING = new Set(['haircut', 'shave', 'trim']);

const SHAVE_CADENCE_D = 4;
const AREA_CADENCE_D: Record<string, number> = {
  underarms: 10, intimate: 14, chest: 21, legs: 21,
};
const EDGE_CLEANUP_ON = '2026-08-20';
const SHAPE_CUT_ON = '2026-09-15';

function dayNumber(d: Date): number {
  const key = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
  return Math.floor(Date.parse(`${key}T00:00:00Z`) / 86_400_000);
}

export async function GET() {
  const role = await getRole();
  const supa = createAdminClient();

  const { data: profileRows } = await supa
    .from('care_profile')
    .select('share_with_partner, hairstyle_goal, growth_started_on')
    .limit(1);
  const profile = profileRows?.[0];
  if (!profile) return NextResponse.json({ enabled: false });

  // The owner always sees his own; she sees it only when he has shared it.
  if (role !== 'owner' && !profile.share_with_partner) {
    return NextResponse.json({ enabled: false });
  }

  const since = new Date(Date.now() - 120 * 86_400_000).toISOString();
  const { data: logs } = await supa
    .from('care_logs')
    .select('action, area, done_at')
    .in('action', [...GROOMING])
    .gte('done_at', since)
    .order('done_at', { ascending: false });

  const today = dayNumber(new Date());
  const sinceDays = (match: (l: { action: string; area: string | null }) => boolean) => {
    const hit = (logs ?? []).find(match);
    return hit ? today - dayNumber(new Date(hit.done_at)) : null;
  };

  const next: Array<{ key: string; label: string; inDays: number | null; detail: string }> = [];

  const shave = sinceDays((l) => l.action === 'shave' && l.area === 'face');
  if (shave !== null) {
    next.push({
      key: 'shave',
      label: 'Clean shave',
      inDays: SHAVE_CADENCE_D - shave,
      detail: shave === 0 ? 'Done today' : `Last done ${shave} ${shave === 1 ? 'day' : 'days'} ago`,
    });
  }

  for (const [area, cadence] of Object.entries(AREA_CADENCE_D)) {
    const d = sinceDays((l) => l.action === 'trim' && l.area === area);
    if (d === null) continue;
    next.push({
      key: `trim-${area}`,
      label: `${area[0].toUpperCase()}${area.slice(1)} trim`,
      inDays: cadence - d,
      detail: d === 0 ? 'Done today' : `Last done ${d} ${d === 1 ? 'day' : 'days'} ago`,
    });
  }

  const dayOf = (iso: string) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86_400_000) - today;
  next.push({ key: 'edge-cleanup', label: 'Edge clean-up', inDays: dayOf(EDGE_CLEANUP_ON), detail: 'Tidy only, no length off' });
  next.push({ key: 'shape-cut', label: 'Shape cut', inDays: dayOf(SHAPE_CUT_ON), detail: 'The two-block shape' });

  next.sort((a, b) => (a.inDays ?? 999) - (b.inDays ?? 999));

  const growthDays =
    profile.growth_started_on
      ? today - Math.floor(Date.parse(`${profile.growth_started_on}T00:00:00Z`) / 86_400_000)
      : null;

  return NextResponse.json({
    enabled: true,
    hairstyleGoal: profile.hairstyle_goal ?? null,
    growthDays,
    next: next.slice(0, 6),
  });
}
