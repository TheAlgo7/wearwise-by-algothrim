import type { Item, ModeRules } from '@/types';

export interface FilterContext {
  temp_c: number;
  time_of_day: 'morning' | 'afternoon' | 'evening' | 'night';
  environment: 'outdoor' | 'indoor-ac';
  event?: string;
  mode_rules: ModeRules;
}

const TEMP_TOLERANCE = 2; // °C slack for min_temp_c (don't freeze out warm items)
// Max-temp filtering is intentionally NOT applied as a general gate — in hot
// climates (e.g. Delhi 38–42°C), people wear all their clothing regardless of
// AI-tagged max_temp_c values. The LLM handles heat-appropriate selection via
// context; hard max gates cause near-empty shortlists (BUG-008).
//
// The ONE exception is the winter guard below: genuinely cold-weather layers
// (coats, puffers, high necks — mid/outer tagged well below current temp) are
// hard-excluded in heat so the winter pool can never contaminate summer
// generation. Thresholds are wide enough that normal summer clothing
// (max_temp_c ~34-38) never trips it, preserving the BUG-008 behaviour.
const WINTER_GUARD_MIN_TEMP = 28;  // °C — guard only engages in real heat
const WINTER_GUARD_EXCESS = 5;     // °C above the item's ceiling before exclusion
const WINTER_GUARD_LAYERS = new Set(['mid', 'outer']);

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
  const layer = it.category?.layer_type ?? '';

  // 1. Excluded layers (e.g. home mode excludes timepieces)
  if (ctx.mode_rules.excluded_layers?.includes(layer)) return false;

  // 2. Footwear vibe gate (e.g. home mode only allows lounge/casual footwear)
  if (layer === 'footwear' && ctx.mode_rules.footwear_vibes_any?.length) {
    if (it.vibe.length > 0 && !it.vibe.some((v) => ctx.mode_rules.footwear_vibes_any!.includes(v))) return false;
  }

  // 3. Weather gate — only min_temp_c (don't underdress in cold).
  //    max_temp_c is NOT enforced as a general hard gate — see comment above.
  //    Bottoms always pass weather gate regardless.
  if (layer !== 'bottom') {
    if (it.min_temp_c !== null && ctx.temp_c < it.min_temp_c - TEMP_TOLERANCE) return false;
  }

  // 3b. Winter guard — cold-weather mid/outer layers stay out of hot-day pools.
  if (
    ctx.temp_c >= WINTER_GUARD_MIN_TEMP &&
    WINTER_GUARD_LAYERS.has(layer) &&
    it.max_temp_c !== null &&
    ctx.temp_c > it.max_temp_c + WINTER_GUARD_EXCESS
  ) {
    return false;
  }

  // 4. Formality gate — scoped by mode rules
  const { min_formality, max_formality } = ctx.mode_rules;
  if (it.formality !== null) {
    if (min_formality != null && it.formality < min_formality) return false;
    if (max_formality != null && it.formality > max_formality) return false;
  }

  // 5. Vibe gates
  if (ctx.mode_rules.excluded_vibes?.length) {
    if (it.vibe.some((v) => ctx.mode_rules.excluded_vibes!.includes(v))) return false;
  }
  if (ctx.mode_rules.required_vibes_any?.length && it.vibe.length > 0) {
    if (!it.vibe.some((v) => ctx.mode_rules.required_vibes_any!.includes(v))) return false;
  }

  // 6. Time-of-day gate (soft — only enforce if item has explicit times)
  if (
    ctx.mode_rules.time_of_day?.length &&
    it.times_of_day.length > 0 &&
    !it.times_of_day.some((t) => ctx.mode_rules.time_of_day!.includes(t))
  ) {
    return false;
  }

  return true;
}

/** Score items so we can boost signature/rare items when many candidates pass.
 *  Items with equal scores are shuffled randomly so every generation has variety. */
export function rankCandidates(items: Item[], rules: ModeRules, temp_c?: number): Item[] {
  const now = Date.now();
  // Attach a small random tiebreaker so same-scored items shuffle each call
  const scored = items.map((it) => ({ it, s: score(it, rules, now, temp_c) + Math.random() * 0.5 }));
  scored.sort((a, b) => b.s - a.s);
  return scored.map((x) => x.it);
}

function score(it: Item, rules: ModeRules, now: number, temp_c?: number): number {
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
  // Soft max_temp penalty — items above their tagged ceiling get deprioritised
  // but are NOT hard-excluded (avoids empty shortlists in Delhi peak summer)
  if (temp_c != null && it.max_temp_c != null && temp_c > it.max_temp_c) {
    s -= 3;
  }
  return s;
}
