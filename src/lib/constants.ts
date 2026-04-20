export const APP_NAME = 'WearWise';
export const APP_TAGLINE = 'Custom made for The Algothrim | Gaurav Kumar';

export const LAYER_TYPES = [
  'base',
  'mid',
  'outer',
  'bottom',
  'footwear',
  'accessory',
  'headwear',
  'eyewear',
  'timepiece',
  'jewelry',
] as const;

export type LayerType = (typeof LAYER_TYPES)[number];

export const FITS = [
  'oversized',
  'relaxed',
  'regular',
  'slim',
  'fitted',
  'bootcut',
  'straight',
  'wide',
  'tapered',
] as const;

export type Fit = (typeof FITS)[number];

export const SLEEVES = [
  'sleeveless',
  'short',
  'three-quarter',
  'long',
  'rolled',
  'none',
] as const;

export type Sleeve = (typeof SLEEVES)[number];

export const VIBES = [
  'casual',
  'street',
  'smart-casual',
  'clean',
  'formal',
  'church',
  'party',
  'gym',
  'lounge',
  'travel',
  'beach',
  'ethnic',
] as const;

export type Vibe = (typeof VIBES)[number];

export const OCCASIONS = [
  'daily',
  'church',
  'work',
  'party',
  'date',
  'trip',
  'gym',
  'home',
  'wedding',
  'funeral',
  'festival',
] as const;

export type Occasion = (typeof OCCASIONS)[number];

export const TIMES_OF_DAY = ['morning', 'afternoon', 'evening', 'night'] as const;
export type TimeOfDay = (typeof TIMES_OF_DAY)[number];

export const MODES = [
  { id: 'quick',    label: 'Quick Fit', hint: 'Something in 2 seconds' },
  { id: 'home',     label: 'Home',      hint: 'Comfy · chill · no pressure' },
  { id: 'casual',   label: 'Casual',    hint: 'Friends · mall · local streets' },
  { id: 'smart',    label: 'Smart',     hint: 'Dinner · meeting · date · family' },
  { id: 'gym',      label: 'Gym',       hint: 'Active · performance · sporty' },
  { id: 'church',   label: 'Church',    hint: 'Sunday · modest · clean' },
  { id: 'travel',   label: 'Travel',    hint: 'Comfort · layering · repeatable' },
  { id: 'impress',  label: 'Impress',   hint: 'Signature combos only' },
  { id: 'night',    label: 'Night',     hint: 'Dark palette · evening' },
  { id: 'describe', label: 'Describe',  hint: 'Tell me where you\'re going' },
] as const;

export type ModeId = (typeof MODES)[number]['id'];

export const ENVIRONMENTS = [
  { id: 'outdoor',    label: 'Outdoor',    icon: 'sun' },
  { id: 'indoor-ac',  label: 'Indoor (AC)', icon: 'snowflake' },
] as const;

export type Environment = (typeof ENVIRONMENTS)[number]['id'];

export const INDOOR_AC_TEMP_C = 22;
