'use client';

import { ItemCard } from '@/components/ItemCard';
import { OneUIChip } from '@/components/oneui';
import { LAYER_TYPES, type LayerType } from '@/lib/constants';
import type { Item } from '@/types';
import { useMemo, useState } from 'react';

interface Props {
  items: Item[];
}

const LAYER_LABELS: Record<LayerType, string> = {
  base:      'Base',
  mid:       'Mid',
  outer:     'Outer',
  bottom:    'Bottoms',
  footwear:  'Shoes',
  accessory: 'Access.',
  headwear:  'Head',
  eyewear:   'Eyes',
  timepiece: 'Watch',
  jewelry:   'Jewelry',
};

export function WardrobeGrid({ items }: Props) {
  const [filter, setFilter] = useState<LayerType | 'all'>('all');

  const presentLayers = useMemo(() => {
    const s = new Set<LayerType>();
    for (const it of items) if (it.category?.layer_type) s.add(it.category.layer_type);
    return LAYER_TYPES.filter((l) => s.has(l));
  }, [items]);

  const visible = filter === 'all' ? items : items.filter((it) => it.category?.layer_type === filter);

  return (
    <div>
      <div className="chip-row mb-4">
        <OneUIChip active={filter === 'all'} onClick={() => setFilter('all')}>
          All · {items.length}
        </OneUIChip>
        {presentLayers.map((l) => (
          <OneUIChip key={l} active={filter === l} onClick={() => setFilter(l)}>
            {LAYER_LABELS[l]}
          </OneUIChip>
        ))}
      </div>
      {visible.length === 0 ? (
        <div className="text-center text-fog-400 text-oneui-body py-10">
          No items yet. Tap the + button to add your first piece.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {visible.map((it) => (
            <ItemCard key={it.id} item={it} />
          ))}
        </div>
      )}
    </div>
  );
}
