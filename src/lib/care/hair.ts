import { APP_TIMEZONE } from '@/lib/weather';
import { shortDate, staleAfter } from '@/lib/care/grooming';
import type { CareLog, CareProduct, CareProfile, DueItem } from '@/lib/care/types';

/**
 * Hair: which bottles are in use, and when the next wash falls.
 *
 * Split out of the engine on 6 Nov 2026, two weeks after the cold perm of
 * 23 Oct. Two things were wrong before it:
 *
 * 1. The everyday shampoo was looked up as a *wishlist* row, so the routine
 *    could only ever show the gap, even once he owned one. And "the medicated
 *    shampoo" was just the first shampoo in the list: a second bottle would
 *    have been served up as a treatment wash.
 * 2. Nothing in the app could log a wash, and no logged wash meant "wash day".
 *    So every single morning had shampoo in it, right next to the shower,
 *    whatever his scalp was doing.
 *
 * The wash is now a window counted from the last logged wash, or from the
 * perm, which rinses the hair at the salon too. A date the app cannot vouch
 * for is shown as unknown, never as overdue, same as shaves and trims.
 *
 * Pure functions of (profile, products, logs, context, now), like the rest of
 * Care. No fetches, no randomness.
 */

// ── Defaults ──────────────────────────────────────────────────────────────

/** "Every 3-4 days", until he changes it in Care settings. */
export const DEFAULT_WASH_MIN_D = 3;
export const DEFAULT_WASH_MAX_D = 4;
/** Salon aftercare: a fresh perm stays dry for its first 72 hours. */
export const PERM_SETTLE_H = 72;
/** Gentle shampoo only, no salt and no heat, for a perm's first two weeks. */
export const PERM_GENTLE_D = 14;
/** Days between treatment washes, by dandruff state. Not an everyday shampoo. */
export const TREATMENT_SHAMPOO_D: Record<string, number | null> = {
  active: 3,
  occasional: 7,
  none: null,
};
/** Modes that mean he is going to sweat. */
const SWEAT_MODES = new Set(['gym']);

/** Actives that make a shampoo a treatment rather than an everyday wash. */
const TREATMENT_ACTIVES = new Set([
  'ketoconazole', 'piroctone-olamine', 'climbazole', 'zinc-pyrithione',
  'selenium-sulfide', 'salicylic-acid', 'ciclopirox', 'coal-tar',
]);

// ── Time ──────────────────────────────────────────────────────────────────

function dayKey(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
}

/** Whole calendar days between two moments in Asia/Kolkata, so a wash at 10pm and a check at 9am the next day is one day. */
function daysBetween(from: Date, to: Date): number {
  const day = (d: Date) => Math.floor(Date.parse(`${dayKey(d)}T00:00:00Z`) / 86_400_000);
  return day(to) - day(from);
}

/** "Mon, 26 Oct, 7:30 pm" in his timezone. */
function dayAndTime(d: Date): string {
  return d.toLocaleString('en-IN', {
    timeZone: APP_TIMEZONE, weekday: 'short', day: 'numeric', month: 'short',
    hour: 'numeric', minute: '2-digit',
  });
}

function hourIn(d: Date): number {
  return Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: APP_TIMEZONE, hour: '2-digit', hourCycle: 'h23' }).format(d)
  ) % 24;
}

function latest(logs: CareLog[], match: (l: CareLog) => boolean): CareLog | null {
  let best: CareLog | null = null;
  for (const l of logs) {
    if (match(l) && (!best || l.done_at > best.done_at)) best = l;
  }
  return best;
}

// ── Products ──────────────────────────────────────────────────────────────

export function isMedicatedShampoo(p: CareProduct): boolean {
  if (p.kind !== 'shampoo') return false;
  if (p.actives.some((a) => TREATMENT_ACTIVES.has(a.trim().toLowerCase()))) return true;
  if (p.frequency === 'by-symptom') return true;
  return /dandruff|medicated|ketoconazole/i.test(`${p.brand ?? ''} ${p.name}`);
}

export interface HairKit {
  /** Everyday wash: owned, never a wishlist gap, never the medicated one. */
  gentle: CareProduct | null;
  /** Treatment wash. Kept apart so it can never become the default. */
  medicated: CareProduct | null;
  /** Rinse-out conditioner. A leave-in is a different step. */
  conditioner: CareProduct | null;
  curlCream: CareProduct | null;
  saltSpray: CareProduct | null;
  clay: CareProduct | null;
  powder: CareProduct | null;
  /** A heat protectant he has not bought yet, when that gap is on the list. */
  heatProtectantGap: CareProduct | null;
}

/** The newest owned bottle of a kind is the one in use. Rows without a date keep their order. */
function newestFirst(list: CareProduct[]): CareProduct[] {
  return list
    .map((p, i) => ({ p, i }))
    .sort((a, b) => (b.p.created_at ?? '').localeCompare(a.p.created_at ?? '') || a.i - b.i)
    .map(({ p }) => p);
}

/** What he owns for his hair, by job. Wishlist rows and archived bottles never fill a step. */
export function pickHairKit(products: CareProduct[]): HairKit {
  const hair = newestFirst(products.filter((p) => p.domain === 'hair' && !p.archived));
  const owned = hair.filter((p) => !p.wishlist);
  const styling = owned.filter((p) => p.kind === 'styling');
  const styler = (re: RegExp) => styling.find((p) => re.test(p.name)) ?? null;

  return {
    gentle: owned.find((p) => p.kind === 'shampoo' && !isMedicatedShampoo(p)) ?? null,
    medicated: owned.find(isMedicatedShampoo) ?? null,
    conditioner: owned.find((p) => p.kind === 'conditioner' && !/leave[- ]?in/i.test(p.name)) ?? null,
    curlCream: styler(/curl|wave/i),
    saltSpray: styler(/salt/i),
    clay: styler(/clay|wax|pomade/i),
    powder: styler(/powder/i),
    heatProtectantGap: hair.find((p) => p.wishlist && /heat/i.test(p.name)) ?? null,
  };
}

// ── The perm ──────────────────────────────────────────────────────────────

export interface PermState {
  at: Date;
  /** Calendar days since, in his timezone. */
  days: number;
  /** First 72 hours: no water at all. */
  settling: boolean;
  /** First two weeks: gentle shampoo only, no salt, no heat. */
  fresh: boolean;
  /** When the no-water period ends. */
  settledAt: Date;
}

/**
 * A perm does not switch off on a date; it relaxes and grows out. The profile
 * says permed until he says otherwise, so there is no expiry here.
 */
export function permState(profile: CareProfile, now: Date): PermState | null {
  if (!profile.perm_on) return null;
  const at = new Date(profile.perm_on);
  if (Number.isNaN(at.getTime()) || at.getTime() > now.getTime()) return null;
  const hours = (now.getTime() - at.getTime()) / 3_600_000;
  const days = daysBetween(at, now);
  return {
    at,
    days,
    settling: hours < PERM_SETTLE_H,
    fresh: days < PERM_GENTLE_D,
    settledAt: new Date(at.getTime() + PERM_SETTLE_H * 3_600_000),
  };
}

export function permSettleText(perm: PermState): string {
  return dayAndTime(perm.settledAt);
}

// ── The wash ──────────────────────────────────────────────────────────────

export function washWindow(profile: CareProfile): { min: number; max: number } {
  const valid = (n: unknown, fallback: number) =>
    typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 14 ? n : fallback;
  const min = valid(profile.wash_min_days, DEFAULT_WASH_MIN_D);
  const max = Math.max(min, valid(profile.wash_max_days, DEFAULT_WASH_MAX_D));
  return { min, max };
}

export interface HairContext {
  mode: string;
  environment: 'outdoor' | 'indoor-ac';
  tempC?: number | null;
  humidity?: number | null;
}

/** A workout, or real heat outdoors: the days that earn a wash a day early if the scalp asks. */
export function sweatyDay(ctx: HairContext): boolean {
  if (SWEAT_MODES.has(ctx.mode)) return true;
  if (ctx.environment === 'indoor-ac') return false;
  const t = ctx.tempC;
  const h = ctx.humidity;
  if (typeof t !== 'number') return false;
  return t >= 34 || (t >= 30 && typeof h === 'number' && h >= 65);
}

export type WashState =
  | 'settling' // fresh perm, no water yet
  | 'washed'   // a wash is logged today
  | 'rest'     // inside the gap, no wash tonight
  | 'early'    // the day before the window, allowed after a sweaty day
  | 'open'     // inside the window: tonight if the scalp wants it
  | 'due'      // the last day of the window
  | 'overdue'  // past the window, by a known number of days
  | 'unknown'; // nothing logged, or the last log is too old to count from

export interface WashPlan {
  state: WashState;
  min: number;
  max: number;
  /** Whole days since the last wash (or the perm). Null when nothing is known. */
  since: number | null;
  /** The moment the count runs from: the last logged wash, or the perm if that came later. */
  lastAt: Date | null;
  /** Tonight's routine carries the wash steps. */
  tonight: boolean;
  /** His call (window open, a day early, date unknown), as opposed to a must. */
  optional: boolean;
  /** The medicated shampoo tonight, rather than the gentle one. */
  treatment: boolean;
  /** A treatment wash was due, but the perm is under two weeks old. */
  heldForPerm: boolean;
  /** One plain sentence the shampoo step leads with. */
  reason: string;
  /** For the Next up row. Negative means overdue, null means unknown. */
  inDays: number | null;
  detail: string;
}

/**
 * When the next wash falls, and with which shampoo.
 *
 * A shower is not an input. Nothing here reads body-wash logs, so getting in
 * the shower can never make a wash due.
 */
export function planWash(
  profile: CareProfile,
  kit: HairKit,
  logs: CareLog[],
  ctx: HairContext,
  now: Date,
): WashPlan {
  const { min, max } = washWindow(profile);
  const span = min === max ? `${min}` : `${min}-${max}`;
  const perm = permState(profile, now);

  const lastWash = latest(logs, (l) => l.action === 'shampoo');
  const lastWashAt = lastWash ? new Date(lastWash.done_at) : null;
  const fromPerm = perm !== null && (lastWashAt === null || perm.at > lastWashAt);
  const lastAt = fromPerm ? perm.at : lastWashAt;
  const since = lastAt ? daysBetween(lastAt, now) : null;

  // Medicated only with a medicated bottle, on the dandruff schedule, and not
  // on a perm under two weeks old unless he is actually flaking.
  const gap = TREATMENT_SHAMPOO_D[profile.dandruff] ?? null;
  const medicated = kit.medicated;
  const lastTreatment = medicated
    ? latest(logs, (l) => l.action === 'shampoo' && l.product_id === medicated.id)
    : null;
  const sinceTreatment = lastTreatment ? daysBetween(new Date(lastTreatment.done_at), now) : null;
  const treatmentDue =
    medicated !== null && gap !== null && (sinceTreatment === null || sinceTreatment >= gap);
  const heldForPerm = treatmentDue && perm !== null && perm.fresh && profile.dandruff !== 'active';

  const base = { min, max, since, lastAt, treatment: treatmentDue && !heldForPerm, heldForPerm };
  const ago = (n: number) =>
    `${fromPerm ? 'Permed' : 'Washed'} ${n === 1 ? 'yesterday' : `${n} days ago`}`;

  if (perm?.settling) {
    const when = permSettleText(perm);
    return {
      ...base,
      state: 'settling',
      tonight: false,
      optional: false,
      reason: `The perm is still setting. No water until ${when}.`,
      inDays: Math.max(daysBetween(now, perm.settledAt), min - perm.days),
      detail: `Perm setting, no water until ${when}`,
    };
  }

  if (since === 0 && lastWash) {
    // The routine keeps showing a wash he logged this evening. A morning wash
    // is over by tonight, so tonight's list does not repeat it.
    const tonight = hourIn(new Date(lastWash.done_at)) >= 17;
    return {
      ...base,
      state: 'washed',
      treatment: medicated !== null && lastWash.product_id === medicated.id,
      tonight,
      optional: false,
      reason: 'Washed today.',
      inDays: min,
      detail: `Washed today, next in ${span} days`,
    };
  }

  if (since === null || since > staleAfter(max)) {
    const last = lastAt ? shortDate(lastAt.toISOString()) : null;
    return {
      ...base,
      state: 'unknown',
      tonight: true,
      optional: true,
      reason: last
        ? `${fromPerm ? 'No wash logged since the perm' : 'Last wash logged'} ${last}. Wash when your scalp feels oily, then log it so the ${span} day count starts from a real date.`
        : `No wash logged yet. Wash when your scalp feels oily, then log it so the ${span} day count can start.`,
      inDays: null,
      detail: last ? `Last logged ${last}` : 'Not logged yet',
    };
  }

  if (since < min) {
    if (since === min - 1 && sweatyDay(ctx)) {
      return {
        ...base,
        state: 'early',
        tonight: true,
        optional: true,
        reason: `Day ${since} of ${span}, but a sweaty one. Washing a day early is fine if your scalp feels it.`,
        inDays: 1,
        detail: 'Tomorrow, or tonight after a sweaty day',
      };
    }
    return {
      ...base,
      state: 'rest',
      tonight: false,
      optional: false,
      reason: `Day ${since} of ${span}.`,
      inDays: min - since,
      detail: ago(since),
    };
  }

  if (since < max) {
    return {
      ...base,
      state: 'open',
      tonight: true,
      optional: true,
      reason: `Day ${since} of ${span}. Tonight if your scalp feels oily or you sweated, otherwise tomorrow.`,
      inDays: 0,
      detail: 'Tonight or tomorrow, your call',
    };
  }

  if (since === max) {
    return {
      ...base,
      state: 'due',
      tonight: true,
      optional: false,
      reason: `Day ${since}, the end of your ${span} day window.`,
      inDays: 0,
      detail: 'Tonight',
    };
  }

  return {
    ...base,
    state: 'overdue',
    tonight: true,
    optional: false,
    reason: `Day ${since}, past your ${span} day window.`,
    inDays: max - since,
    detail: ago(since),
  };
}

/** The "Next up" row for the wash, with the shampoo choice the log sheet offers. */
export function washDueItem(plan: WashPlan, kit: HairKit): DueItem {
  const suggested = plan.treatment ? kit.medicated : kit.gentle;
  const choices = [kit.gentle, kit.medicated]
    .filter((p): p is CareProduct => p !== null)
    .map((p) => ({ product_id: p.id, label: isMedicatedShampoo(p) ? 'Medicated' : 'Gentle' }));

  return {
    key: 'hair-wash',
    label: 'Hair wash',
    inDays: plan.inDays,
    detail: plan.detail,
    domain: 'hair',
    stale: plan.state === 'unknown',
    lastDone: plan.lastAt?.toISOString() ?? null,
    // Nothing to log while the perm is setting: there is no wash to record.
    log:
      plan.state === 'settling'
        ? undefined
        : {
            action: 'shampoo',
            area: 'scalp',
            domain: 'hair',
            product_id: suggested?.id ?? kit.gentle?.id ?? null,
            choices: choices.length > 1 ? choices : undefined,
          },
  };
}
