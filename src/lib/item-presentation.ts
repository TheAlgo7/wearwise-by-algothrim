import type { Item } from '@/types';

const FOOTWEAR_TERMS = ['footwear', 'shoe', 'sneaker', 'boot', 'loafer', 'sandal', 'slide', 'slipper'];

export function isFootwear(item: Pick<Item, 'category' | 'name'>) {
  const layer = item.category?.layer_type?.toLowerCase() ?? '';
  const category = item.category?.name?.toLowerCase() ?? '';
  const name = item.name.toLowerCase();

  return layer === 'footwear' || FOOTWEAR_TERMS.some((term) => category.includes(term) || name.includes(term));
}

export function itemImageInset(item: Pick<Item, 'category' | 'name'>) {
  return isFootwear(item) ? 'inset-[6%]' : 'inset-0';
}

const isShirt = (i: Item) => (i.category?.name ?? '').toLowerCase() === 'shirt';

/**
 * The shirt worn open over a tee, if the outfit has one.
 *
 * Shirts are `base` in his taxonomy (they stand alone), so an outfit with a
 * tee and an open-wearable shirt is one look with the shirt as its outer
 * layer. /api/generate dedupes on the same rule; the layout and the colour
 * story lead with that shirt because it is what you see first.
 */
export function openShirtOverTee(items: Item[]): Item | undefined {
  const hasTee = items.some((i) => i.category?.layer_type === 'base' && !isShirt(i));
  if (!hasTee) return undefined;
  return items.find((i) => i.category?.layer_type === 'base' && isShirt(i) && i.can_be_worn_open);
}

/**
 * Front to back, the order the eye reads a look in: an outer layer, then a mid
 * layer or an open shirt, then what is under it, then the bottom, the shoes,
 * and the pieces that finish it.
 */
const READ_ORDER: Record<string, number> = {
  outer: 0, mid: 1, base: 3, bottom: 4, footwear: 5,
  headwear: 6, eyewear: 7, timepiece: 8, jewelry: 9, accessory: 10,
};

export function readOrder(items: Item[]): Item[] {
  const over = openShirtOverTee(items);
  const rank = (i: Item) => (i === over ? 2 : READ_ORDER[i.category?.layer_type ?? ''] ?? 99);
  return [...items].sort((a, b) => rank(a) - rank(b));
}
