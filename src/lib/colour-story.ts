import type { Item } from '@/types';

/**
 * An outfit's colour story, from the colour names already on every item.
 *
 * WearWise is fashion first: colour and proportion decide the outfit. The
 * reasoning sentence always talks about the colour story, but the screen never
 * showed one. This turns `primary_color` into swatches for the caption and
 * picks the single colour the outfit is lit by.
 */

/** Garment colours as they actually photograph, not as CSS names. */
const SWATCH: Record<string, string> = {
  black: '#141213',
  charcoal: '#3A3839',
  grey: '#8C8A8B',
  gray: '#8C8A8B',
  white: '#F2F0EC',
  cream: '#EFE4CB',
  ivory: '#F1EAD8',
  beige: '#D6C2A0',
  sand: '#D2BC94',
  camel: '#C19A6B',
  tan: '#BE996C',
  khaki: '#B9A77E',
  brown: '#6E4B30',
  'dark brown': '#4A3222',
  coffee: '#5B3A29',
  navy: '#1F2A44',
  blue: '#3C6DB4',
  'light blue': '#9DBBDD',
  teal: '#1F7A78',
  green: '#3E7B4F',
  olive: '#6B6A2E',
  yellow: '#E1C54A',
  mustard: '#CF9F2B',
  gold: '#C8A24B',
  red: '#C4202F',
  burgundy: '#76202D',
  maroon: '#6B1B25',
  pink: '#E39AB1',
  'dusty rose': '#B98389',
  rust: '#9B4B32',
  denim: '#3B5F86',
  indigo: '#2E3A78',
  purple: '#7B5BA5',
  lilac: '#B7A2D6',
  silver: '#B9BBBE',
};

/** Colours that frame a look rather than define it. */
const NEUTRAL = new Set(['black', 'charcoal', 'grey', 'gray', 'white', 'cream', 'ivory', 'silver']);

/** Order the pieces are read in: the top tells the story, shoes finish it. */
const LAYER_WEIGHT: Record<string, number> = {
  base: 0, mid: 1, outer: 2, bottom: 3, footwear: 4,
  headwear: 5, eyewear: 6, timepiece: 7, jewelry: 8, accessory: 9,
};

export interface ColourStory {
  /** Up to four colours, in the order the eye meets them. */
  swatches: Array<{ name: string; hex: string }>;
  /** The colour the outfit is lit by, as an `rgb()` string for `--story`. */
  light: string;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

export function swatchFor(name: string | null | undefined): string | null {
  if (!name) return null;
  return SWATCH[name.trim().toLowerCase()] ?? null;
}

export function colourStory(items: Item[]): ColourStory {
  const ordered = [...items].sort(
    (a, b) =>
      (LAYER_WEIGHT[a.category?.layer_type ?? ''] ?? 99) - (LAYER_WEIGHT[b.category?.layer_type ?? ''] ?? 99)
  );

  // Clothes first. A watch or a belt can be in the palette, but never ahead of
  // the shirt and trousers that actually carry it.
  const clothing = ordered.filter((i) => (LAYER_WEIGHT[i.category?.layer_type ?? ''] ?? 99) <= 4);
  const source = clothing.length > 0 ? clothing : ordered;

  const seen = new Set<string>();
  const swatches: ColourStory['swatches'] = [];
  for (const it of source) {
    const name = it.primary_color?.trim().toLowerCase();
    const hex = swatchFor(name);
    if (!name || !hex || seen.has(name)) continue;
    seen.add(name);
    swatches.push({ name: name[0].toUpperCase() + name.slice(1), hex });
    if (swatches.length === 4) break;
  }

  // Lit by the first colour that is not a neutral. An all-neutral outfit gets a
  // quiet warm light rather than none, so the stage never goes dead.
  const lead = swatches.find((s) => !NEUTRAL.has(s.name.toLowerCase()));
  const [r, g, b] = lead ? hexToRgb(lead.hex) : [150, 132, 134];
  return { swatches, light: `rgb(${r} ${g} ${b})` };
}
