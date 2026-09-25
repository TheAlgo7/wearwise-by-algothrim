import { APP_TIMEZONE } from '@/lib/weather';
import type { DueItem } from '@/lib/care/types';

/**
 * When the next shave, trim and haircut fall.
 *
 * One module for both readers. The Care engine (his screen) and
 * /api/grooming-status (Ishita's card) each used to carry their own copy of
 * these cadences and two hardcoded plan dates, 2026-08-20 and 2026-09-15. Once
 * those dates passed, both screens counted up forever: "36d over", "48d over",
 * on his phone and on hers, because nothing in the app could log a shave.
 *
 * Two changes make it tell the truth:
 *
 * 1. Haircut milestones run off the last haircut logged, not fixed dates. The
 *    old dates were exactly 16 and 42 days after the 4 August cut, so the plan
 *    is unchanged; it just moves forward when a new cut is logged.
 * 2. A date far past its cadence is not "overdue", it is unknown. Nothing has
 *    been logged, so the app does not know when he last shaved and says so
 *    ("Last logged 4 Aug") instead of inventing an overdue count.
 */

export const SHAVE_CADENCE_D = 4;
export const AREA_CADENCE_D: Record<string, number> = {
  underarms: 10,
  intimate: 14,
  chest: 21,
  legs: 21,
};
/** Sideburns, ears and nape tidied this long after any cut. */
export const EDGE_CADENCE_D = 16;
/** The proper two-block shape cut, this long after the last full cut. */
export const SHAPE_CADENCE_D = 42;

/** Area value a logged edge clean-up carries, as opposed to a full cut ('scalp'). */
export const EDGE_AREA = 'edges';

interface LogLike {
  action: string;
  area: string | null;
  done_at: string;
}

function dayKey(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
}

/** Calendar day index in the app's timezone, so arithmetic counts sleeps. */
function dayNumber(d: Date): number {
  return Math.floor(Date.parse(`${dayKey(d)}T00:00:00Z`) / 86_400_000);
}

function latest(logs: LogLike[], match: (l: LogLike) => boolean): LogLike | null {
  let best: LogLike | null = null;
  for (const l of logs) {
    if (match(l) && (!best || l.done_at > best.done_at)) best = l;
  }
  return best;
}

/**
 * Past this point a missed date means "not logged", not "neglected".
 * Shave (4d) goes quiet after 11 days, a 21-day trim after 42.
 */
function staleAfter(cadence: number): number {
  return Math.max(cadence * 2, cadence + 7);
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    timeZone: APP_TIMEZONE, day: 'numeric', month: 'short',
  });
}

function ago(days: number): string {
  if (days === 0) return 'Done today';
  if (days === 1) return 'Done yesterday';
  return `Last done ${days} days ago`;
}

/** Everything grooming-shaped that has a next date, soonest first. */
export function groomingDue(logs: LogLike[], now: Date): DueItem[] {
  const today = dayNumber(now);
  const out: DueItem[] = [];

  const push = (
    base: Omit<DueItem, 'inDays' | 'stale' | 'lastDone' | 'detail'> & { detail?: string },
    last: LogLike | null,
    cadence: number,
  ) => {
    if (!last) return;
    const since = today - dayNumber(new Date(last.done_at));
    const stale = since > staleAfter(cadence);
    out.push({
      ...base,
      inDays: cadence - since,
      stale,
      lastDone: last.done_at,
      detail: stale ? `Last logged ${shortDate(last.done_at)}` : base.detail ?? ago(since),
    });
  };

  push(
    { key: 'shave', label: 'Clean shave', domain: 'body', log: { action: 'shave', area: 'face', domain: 'body' } },
    latest(logs, (l) => l.action === 'shave' && l.area === 'face'),
    SHAVE_CADENCE_D,
  );

  for (const [area, cadence] of Object.entries(AREA_CADENCE_D)) {
    push(
      {
        key: `trim-${area}`,
        label: `${area[0].toUpperCase()}${area.slice(1)}`,
        domain: 'body',
        log: { action: 'trim', area, domain: 'body' },
      },
      latest(logs, (l) => l.action === 'trim' && l.area === area),
      cadence,
    );
  }

  const anyCut = latest(logs, (l) => l.action === 'haircut');
  const fullCut = latest(logs, (l) => l.action === 'haircut' && l.area !== EDGE_AREA);

  push(
    {
      key: 'edge-cleanup',
      label: 'Edge clean-up',
      domain: 'hair',
      detail: 'Sideburns, around the ears, nape. No top cutting, no fringe shortening.',
      log: { action: 'haircut', area: EDGE_AREA, domain: 'hair' },
    },
    anyCut,
    EDGE_CADENCE_D,
  );

  if (fullCut) {
    const sinceCut = today - dayNumber(new Date(fullCut.done_at));
    push(
      {
        key: 'shape-cut',
        label: 'Shape cut',
        domain: 'hair',
        detail: `Two-block shape, ${sinceCut} ${sinceCut === 1 ? 'day' : 'days'} into the grow-out.`,
        log: { action: 'haircut', area: 'scalp', domain: 'hair' },
      },
      fullCut,
      SHAPE_CADENCE_D,
    );
  }

  // Known dates first, soonest first; unknown ones after, so a stale shave
  // never outranks a trim that is genuinely due tomorrow.
  return out.sort(
    (a, b) => Number(a.stale) - Number(b.stale) || (a.inDays ?? 999) - (b.inDays ?? 999)
  );
}
