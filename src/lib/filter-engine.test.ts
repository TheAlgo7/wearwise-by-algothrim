import { describe, expect, it } from 'vitest';
import { filterItems, type FilterContext } from '@/lib/filter-engine';
import { DEFAULT_MODES } from '@/lib/modes';
import type { Item, LayerType } from '@/types';

// His real accessories, tagged as they are in the wardrobe (6 Nov 2026).
function item(name: string, category: string, layer: LayerType, formality: number, vibe: string[]): Item {
  return {
    id: name, name, category_id: category, image_url: null, image_path: null, primary_color: 'black',
    secondary_colors: [], fit: null, sleeve_length: null, can_be_worn_open: false, material: [],
    formality, vibe, min_temp_c: null, max_temp_c: null, occasions: [], times_of_day: [], notes: null,
    times_worn: 0, last_worn_at: null, archived: false, created_at: '', updated_at: '',
    category: { id: category, name: category, layer_type: layer, icon: null, sort_order: 0, created_at: '' },
  };
}

const DRESS_BELT = item('Black Plaque-Buckle Dress Belt', 'Belt', 'accessory', 4, ['formal', 'smart-casual', 'signature']);
const TEXTURED_BELT = item('Black Textured Plaque-Buckle Belt', 'Belt', 'accessory', 4, ['formal', 'smart-casual', 'signature']);
const METAL_WATCH = item('Black Chronograph Metal Watch', 'Watch', 'timepiece', 4, ['formal', 'smart-casual']);
const SMARTWATCH = item('Black Round Smartwatch', 'Watch', 'timepiece', 2, ['gym', 'casual']);
const TIE = item('Black Silk Tie', 'Tie', 'accessory', 5, ['formal']);
const BLAZER = item('Navy Blazer', 'Blazer', 'outer', 5, ['formal', 'smart-casual']);
const ALL = [DRESS_BELT, TEXTURED_BELT, METAL_WATCH, SMARTWATCH, TIE, BLAZER];

const ctx = (mode: string): FilterContext => ({
  temp_c: 24,
  time_of_day: 'afternoon',
  environment: 'outdoor',
  mode_rules: DEFAULT_MODES.find((m) => m.id === mode)!.rules,
  season: 'autumn',
});
const names = (mode: string) => filterItems(ALL, ctx(mode)).map((i) => i.name);

describe('accessories follow the outfit, not the occasion', () => {
  it('lets his favourite dress belts and metal watches into casual looks', () => {
    expect(names('casual')).toEqual(expect.arrayContaining([DRESS_BELT.name, TEXTURED_BELT.name, METAL_WATCH.name]));
  });

  it('still keeps formal clothing and ties out of casual', () => {
    expect(names('casual')).not.toContain(BLAZER.name);
    expect(names('casual')).not.toContain(TIE.name);
  });

  it('keeps every gate at home and at the gym', () => {
    expect(names('home')).not.toContain(DRESS_BELT.name);
    expect(names('home')).not.toContain(METAL_WATCH.name);
    expect(names('gym')).not.toContain(DRESS_BELT.name);
    expect(names('gym')).toContain(SMARTWATCH.name);
  });

  it('still keeps the gym smartwatch out of smart looks', () => {
    expect(names('smart')).not.toContain(SMARTWATCH.name);
    expect(names('smart')).toContain(METAL_WATCH.name);
  });
});
