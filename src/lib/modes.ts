import type { Mode, ModeRules } from '@/types';

/** Default mode rules used as fallback if DB fetch fails. */
export const DEFAULT_MODES: Mode[] = [
  { id: 'quick',   label: 'Quick Fit', hint: 'Something in 2 seconds',       rules: { min_formality: 1, max_formality: 5 }, sort_order: 1 },
  { id: 'church',  label: 'Church',    hint: 'Sunday · modest · clean',     rules: { min_formality: 3, excluded_vibes: ['gym','lounge','party'], required_vibes_any: ['clean','smart-casual','formal'] }, sort_order: 2 },
  { id: 'travel',  label: 'Travel',    hint: 'Comfort · layering · repeatable', rules: { min_formality: 1, max_formality: 4, prefer_layering: true, favor_tags: ['travel','comfortable'] }, sort_order: 3 },
  { id: 'impress', label: 'Impress',   hint: 'Signature combos only',       rules: { min_formality: 3, favor_signature: true, avoid_recently_worn_days: 7 }, sort_order: 4 },
  { id: 'night',   label: 'Night',     hint: 'Dark palette · evening',      rules: { min_formality: 2, palette_boost: 'dark', time_of_day: ['evening','night'] }, sort_order: 5 },
];

export function modeForDate(d: Date = new Date()): string {
  return d.getDay() === 0 ? 'church' : 'quick';
}

export function mergeModeRules(base: ModeRules, extra?: ModeRules): ModeRules {
  return { ...base, ...(extra ?? {}) };
}
