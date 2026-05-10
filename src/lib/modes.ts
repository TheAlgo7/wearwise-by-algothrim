import type { Mode, ModeRules } from '@/types';

/** Default mode rules used as fallback if DB fetch fails. */
export const DEFAULT_MODES: Mode[] = [
  { id: 'quick',    label: 'Quick Fit', hint: 'Something in 2 seconds',          rules: { min_formality: 1, max_formality: 5 }, sort_order: 1 },
  { id: 'home',     label: 'Home',      hint: 'Comfy · chill · no pressure',     rules: { min_formality: 1, max_formality: 2, required_vibes_any: ['casual','lounge','gym'], excluded_layers: ['timepiece'], footwear_vibes_any: ['casual','lounge','gym','beach'] }, sort_order: 2 },
  { id: 'casual',   label: 'Casual',    hint: 'Friends · mall · local streets',  rules: { min_formality: 1, max_formality: 3, required_vibes_any: ['casual','street','clean'] }, sort_order: 3 },
  { id: 'smart',    label: 'Smart',     hint: 'Dinner · meeting · date · family', rules: { min_formality: 3, max_formality: 5, excluded_vibes: ['gym','lounge'], required_vibes_any: ['smart-casual','clean','formal'] }, sort_order: 4 },
  { id: 'gym',      label: 'Gym',       hint: 'Active · performance · sporty',   rules: { min_formality: 1, max_formality: 2, required_vibes_any: ['gym','casual'] }, sort_order: 5 },
  { id: 'church',   label: 'Church',    hint: 'Sunday · modest · clean',         rules: { min_formality: 3, excluded_vibes: ['gym','lounge','party'], required_vibes_any: ['clean','smart-casual','formal'] }, sort_order: 6 },
  { id: 'travel',   label: 'Travel',    hint: 'Comfort · layering · repeatable', rules: { min_formality: 1, max_formality: 4, prefer_layering: true, favor_tags: ['travel','comfortable'] }, sort_order: 7 },
  { id: 'impress',  label: 'Impress',   hint: 'Signature combos only',           rules: { min_formality: 1, favor_signature: true, avoid_recently_worn_days: 7 }, sort_order: 8 },
  { id: 'night',    label: 'Night',     hint: 'Dark palette · evening',          rules: { min_formality: 2, palette_boost: 'dark', time_of_day: ['evening','night'] }, sort_order: 9 },
  { id: 'describe', label: 'Describe',  hint: 'Tell me where you\'re going',     rules: { min_formality: 1, max_formality: 5 }, sort_order: 10 },
];

export function modeForDate(d: Date = new Date()): string {
  return d.getDay() === 0 ? 'church' : 'quick';
}

export function mergeModeRules(base: ModeRules, extra?: ModeRules): ModeRules {
  return { ...base, ...(extra ?? {}) };
}

/**
 * Keyword map for Describe mode — parses the user's free-text prompt and
 * returns a min_formality override so the Bouncer can filter candidates
 * before the LLM sees them. Only overrides when a confident signal is found.
 *
 * Formality scale: 1 = lounge/gym, 2 = casual, 3 = smart-casual, 4 = formal, 5 = black-tie
 */
const FORMALITY_SIGNALS: { keywords: string[]; min: number; max?: number }[] = [
  // Black-tie / very formal
  { keywords: ['black tie', 'gala', 'black-tie', 'tuxedo'], min: 5 },
  // Formal / office / professional
  { keywords: ['wedding', 'interview', 'office', 'corporate', 'presentation', 'conference'], min: 4 },
  // Smart / dinner / date / meeting
  { keywords: ['dinner', 'date', 'meeting', 'restaurant', 'family event', 'anniversary', 'farewell', 'graduation', 'church', 'pray', 'sunday'], min: 3, max: 5 },
  // Smart-casual / party / social
  { keywords: ['party', 'rooftop', 'club', 'lounge', 'bar', 'brunch', 'outing', 'catch up', 'social'], min: 2, max: 4 },
  // Casual / chill
  { keywords: ['casual', 'chill', 'mall', 'market', 'coffee', 'walk', 'hangout', 'friends', 'errand', 'grocery'], min: 1, max: 3 },
  // Active / gym
  { keywords: ['gym', 'workout', 'run', 'jog', 'sport', 'exercise', 'yoga', 'hiking', 'trek'], min: 1, max: 2 },
];

export function extractDescribeFormality(prompt: string): { min_formality?: number; max_formality?: number } {
  if (!prompt) return {};
  const lower = prompt.toLowerCase();
  for (const signal of FORMALITY_SIGNALS) {
    if (signal.keywords.some((kw) => lower.includes(kw))) {
      return { min_formality: signal.min, ...(signal.max !== undefined ? { max_formality: signal.max } : {}) };
    }
  }
  return {};
}
