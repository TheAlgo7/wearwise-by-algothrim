import { NextResponse } from 'next/server';
import { getRole } from '@/lib/auth';
import { groomingDue } from '@/lib/care/grooming';
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
 *
 * Dates come from lib/care/grooming, the same function his own Care screen
 * uses. Stale ones (nothing logged in weeks) are dropped for her rather than
 * shown: "48d over" on her home screen was the app guessing, and it was
 * guessing about his body.
 */

const GROOMING = ['haircut', 'shave', 'trim'];

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
    .in('action', GROOMING)
    .gte('done_at', since)
    .order('done_at', { ascending: false });

  const now = new Date();
  const next = groomingDue(logs ?? [], now)
    .filter((d) => !d.stale)
    .map((d) => ({
      key: d.key,
      // Her card reads "Underarms trim", his list reads "Underarms" under a
      // heading that already says what it is.
      label: d.key.startsWith('trim-') ? `${d.label} trim` : d.label,
      inDays: d.inDays,
      detail: d.key === 'edge-cleanup' ? 'Tidy only, no length off' : d.detail,
    }));

  const growthDays =
    profile.growth_started_on
      ? dayNumber(now) - Math.floor(Date.parse(`${profile.growth_started_on}T00:00:00Z`) / 86_400_000)
      : null;

  return NextResponse.json({
    enabled: true,
    hairstyleGoal: profile.hairstyle_goal ?? null,
    growthDays,
    next: next.slice(0, 6),
  });
}
