import type { Item, ModeRules } from '@/types';

export interface FilterContext {
  temp_c: number;
  time_of_day: 'morning' | 'afternoon' | 'evening' | 'night';
  environment: 'outdoor' | 'indoor-ac';
  event?: string;
  mode_rules: ModeRules;
}

const TEMP_TOLERANCE = 2; // °C slack so we don't over-filter edge items

/**
 * The Bouncer.
 *
 * Reduces a full wardrobe to a shortlist the AI can reason over without
 * blowing the prompt size or fighting obvious mismatches.
 */
export function filterItems(items: Item[], ctx: FilterContext): Item[] {
  return items.filter((it) => !it.archived && passesGates(it, ctx));
}

function passesGates(it: Item, ctx: FilterContext): boolean {
  // 1. Weather gate — respect stored min/max with a small tolerance
  if (it.min_temp_c !== null && ctx.temp_c < it.min_temp_c - TEMP_TOLERANCE) return false;
  if (it.max_temp_c !== null && ctx.temp_c > it.max_temp_c + TEMP_TOLERANCE) return false;

  // 2. Formality gate — scoped by mode rules
  const { min_formality, max_formality } = ctx.mode_rules;
  if (it.formality !== null) {
    if (min_formality != null && it.formality < min_formality) return false;
    if (max_formality != null && it.formality > max_formality) return false;
  }

  // 3. Vibe gates
  if (ctx.mode_rules.excluded_vibes?.length) {
    if (it.vibe.some((v) => ctx.mode_rules.excluded_vibes!.includes(v))) return false;
  }
  if (ctx.mode_rules.required_vibes_any?.length && it.vibe.length > 0) {
    if (!it.vibe.some((v) => ctx.mode_rules.required_vibes_any!.includes(v))) return false;
  }

  // 4. Time-of-day gate (soft — only enforce if item has explicit times)
  if (
    ctx.mode_rules.time_of_day?.length &&
    it.times_of_day.length > 0 &&
    !it.times_of_day.some((t) => ctx.mode_rules.time_of_day!.includes(t))
  ) {
    return false;
  }

  return true;
}

/** Score items so we can boost signature/rare items when many candidates pass. */
export function rankCandidates(items: Item[], rules: ModeRules): Item[] {
  const now = Date.now();
  return [...items].sort((a, b) => score(b, rules, now) - score(a, rules, now));
}

function score(it: Item, rules: ModeRules, now: number): number {
  let s = 0;
  // Recency penalty — prefer items not worn recently
  if (it.last_worn_at) {
    const daysAgo = (now - new Date(it.last_worn_at).getTime()) / 86_400_000;
    s += Math.min(daysAgo / 7, 5);
  } else {
    s += 3; // unworn items get a modest boost
  }
  // Favor tags
  if (rules.favor_tags?.length) {
    for (const tag of rules.favor_tags) {
      if (it.vibe.includes(tag) || it.occasions.includes(tag)) s += 2;
    }
  }
  // Avoid recently worn (strict)
  if (rules.avoid_recently_worn_days && it.last_worn_at) {
    const daysAgo = (now - new Date(it.last_worn_at).getTime()) / 86_400_000;
    if (daysAgo < rules.avoid_recently_worn_days) s -= 10;
  }
  return s;
}
