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
