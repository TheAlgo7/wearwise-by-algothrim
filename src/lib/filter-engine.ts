import type { Item, ModeRules } from '@/types';

export interface FilterContext {
  temp_c: number;
  time_of_day: 'morning' | 'afternoon' | 'evening' | 'night';
  environment: 'outdoor' | 'indoor-ac';
  event?: string;
  mode_rules: ModeRules;
}

const TEMP_TOLERANCE = 2; // °C slack for min_temp_c (don't freeze out warm items)
// Max-temp filtering is intentionally NOT applied — in hot climates (e.g. Delhi 38–42°C),
// people wear all their clothing regardless of AI-tagged max_temp_c values.
// The LLM handles heat-appropriate selection via context; hard max gates cause near-empty shortlists.

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

  // 3. Weather gate — only min_temp_c (don't wear a puffer jacket in summer).
  //    max_temp_c is NOT enforced as a hard gate — see comment above.
  //    Bottoms always pass weather gate regardless.
  if (layer !== 'bottom') {
    if (it.min_temp_c !== null && ctx.temp_c < it.min_temp_c - TEMP_TOLERANCE) return false;
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
export function rankCandidates(items: Item[], rules: ModeRules): Item[] {
  const now = Date.now();
  // Attach a small random tiebreaker so same-scored items shuffle each call
  const scored = items.map((it) => ({ it, s: score(it, rules, now) + Math.random() * 0.5 }));
  scored.sort((a, b) => b.s - a.s);
  return scored.map((x) => x.it);
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
