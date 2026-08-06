import { MODES, type Environment } from '@/lib/constants';
import type { Season } from '@/lib/season';
import type { GeneratedOutfit } from '@/types';

/**
 * Everything the engine assumes when it picks today's outfit.
 *
 * This used to be six separate controls stacked on the home screen, which meant
 * answering six questions before the app would answer the only one that
 * matters. It is one object now: summarised in a single line, edited in one
 * sheet, and otherwise invisible.
 */
export type PlannedFor = 'now' | 'tonight' | 'tomorrow';

export interface TodayContext {
  mode: string;
  environment: Environment;
  plannedFor: PlannedFor;
  /** Non-null when he is dressing for somewhere other than where he is. */
  tripCity: string | null;
}

export const PLANNED_FOR_LABELS: Record<PlannedFor, string> = {
  now: 'Now',
  tonight: 'Tonight',
  tomorrow: 'Tomorrow',
};

const modeLabels = new Map(MODES.map((m) => [m.id, m.label]));

export function modeLabel(id: string): string {
  return modeLabels.get(id as (typeof MODES)[number]['id']) ?? id;
}

/**
 * The one line that replaces the controls card.
 *
 * Reads as a sentence of facts, not a set of fields: "Delhi · 29° · Casual ·
 * Outdoor · Now". Place and temperature come first because they are the parts
 * he did not choose and might want to correct.
 */
export function contextSummary(
  ctx: TodayContext,
  opts: { city?: string | null; tempC?: number | null }
): string {
  const parts: string[] = [];
  const place = ctx.tripCity ?? opts.city;
  if (place) parts.push(place);
  if (typeof opts.tempC === 'number' && Number.isFinite(opts.tempC)) {
    parts.push(`${Math.round(opts.tempC)}°`);
  }
  parts.push(modeLabel(ctx.mode));
  parts.push(ctx.environment === 'indoor-ac' ? 'Indoors' : 'Outdoor');
  parts.push(PLANNED_FOR_LABELS[ctx.plannedFor]);
  return parts.join(' · ');
}

/**
 * Identity of a recommendation.
 *
 * Today's fit is cached against this so reopening the app shows the same outfit
 * instead of burning another model call, while any real change of context (a
 * different occasion, a trip, a new day) invalidates it immediately.
 */
export function contextSignature(ctx: TodayContext, season: Season, now: Date = new Date()): string {
  const day = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  return [day, season, ctx.mode, ctx.environment, ctx.plannedFor, ctx.tripCity ?? 'here'].join('|');
}

/* ── Today's fit, remembered ───────────────────────────────────────────────
   The home screen generates on open so the outfit is already there. That is
   only affordable because the result is cached against the signature above:
   the same morning, same plans, same city gets the same fit back instead of
   another model call. Anything that actually changes the question clears it. */

const FIT_KEY = 'wearwise.today.fit';

export interface TodayFitCache {
  signature: string;
  outfits: GeneratedOutfit[];
  advisory: string | null;
  /** Which option of the batch he was last looking at. */
  index: number;
  /** Batch positions already logged as worn, so a reload cannot double-log. */
  worn: number[];
  saved: number[];
}

export function readTodayFit(): TodayFitCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(FIT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TodayFitCache;
    if (typeof parsed?.signature !== 'string' || !Array.isArray(parsed.outfits)) return null;
    return {
      ...parsed,
      index: typeof parsed.index === 'number' ? parsed.index : 0,
      worn: Array.isArray(parsed.worn) ? parsed.worn : [],
      saved: Array.isArray(parsed.saved) ? parsed.saved : [],
    };
  } catch {
    return null;
  }
}

export function writeTodayFit(cache: TodayFitCache): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FIT_KEY, JSON.stringify(cache));
  } catch {
    /* storage full or blocked; the fit just regenerates next open */
  }
}

/* ── The context itself, shared across pages ───────────────────────────────
   Care asks the same questions the outfit engine does: is he going out, is it
   an event, is it tonight. Making him answer them twice, in two different
   sheets, would be the exact thing this redesign removed. Today owns the
   context and writes it here; Care reads it. */

const CTX_KEY = 'wearwise.today.context';

export function writeTodayContext(ctx: TodayContext): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CTX_KEY, JSON.stringify(ctx));
  } catch {
    /* falls back to defaults below */
  }
}

export function readTodayContext(): TodayContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CTX_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TodayContext;
    return typeof parsed?.mode === 'string' ? parsed : null;
  } catch {
    return null;
  }
}
