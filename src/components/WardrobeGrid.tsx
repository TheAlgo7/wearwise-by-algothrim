'use client';

import { ItemCard } from '@/components/ItemCard';
import { OneUIChip } from '@/components/oneui';
import { LAYER_TYPES, type LayerType } from '@/lib/constants';
import type { Item } from '@/types';
import { ChevronDown, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

interface Props {
  items: Item[];
}

const TAB_KEY = 'wearwise.wardrobe.tab';
const SORT_KEY = 'wearwise.wardrobe.sort';

const LAYER_LABELS: Record<LayerType, string> = {
  base: 'Base',
  mid: 'Mid',
  outer: 'Outer',
  bottom: 'Bottoms',
  footwear: 'Shoes',
  accessory: 'Access.',
  headwear: 'Head',
  eyewear: 'Eyes',
  timepiece: 'Watch',
  jewelry: 'Jewelry',
};

type SortKey = 'newest' | 'least-worn' | 'most-worn' | 'name';

const SORTS: Array<{ id: SortKey; label: string }> = [
  { id: 'newest', label: 'Recent' },
  { id: 'least-worn', label: 'Least worn' },
  { id: 'most-worn', label: 'Most worn' },
  { id: 'name', label: 'A-Z' },
];

export function WardrobeGrid({ items }: Props) {
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSortState] = useState<SortKey>(() => {
    if (typeof window === 'undefined') return 'newest';
    return (sessionStorage.getItem(SORT_KEY) as SortKey) ?? 'newest';
  });
  const [filter, setFilterState] = useState<LayerType | 'all'>(() => {
    if (typeof window === 'undefined') return 'all';
    return (sessionStorage.getItem(TAB_KEY) as LayerType | 'all') ?? 'all';
  });

  function setFilter(val: LayerType | 'all') {
    sessionStorage.setItem(TAB_KEY, val);
    setFilterState(val);
  }

  function setSort(val: SortKey) {
    sessionStorage.setItem(SORT_KEY, val);
    setSortState(val);
  }

  const presentLayers = useMemo(() => {
    const s = new Set<LayerType>();
    for (const it of items) if (it.category?.layer_type) s.add(it.category.layer_type);
    return LAYER_TYPES.filter((l) => s.has(l));
  }, [items]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = items.filter((it) => {
      if (filter !== 'all' && it.category?.layer_type !== filter) return false;
      if (!q) return true;
      return [
        it.name,
        it.category?.name,
        it.fit,
        it.primary_color,
        ...it.secondary_colors,
        ...it.material,
        ...it.vibe,
        ...it.occasions,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });

    return [...filtered].sort((a, b) => {
      if (sort === 'least-worn') return (a.times_worn ?? 0) - (b.times_worn ?? 0);
      if (sort === 'most-worn') return (b.times_worn ?? 0) - (a.times_worn ?? 0);
      if (sort === 'name') return a.name.localeCompare(b.name);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [filter, items, query, sort]);

  return (
    <div>
      <div className="glass-card h-12 px-4 flex items-center gap-3 mb-3">
        <Search size={17} style={{ color: '#FF86A0' }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search wardrobe"
          className="min-w-0 flex-1 bg-transparent outline-none text-[15px] text-[#FFEDE8] placeholder:text-[#A89098]"
        />
      </div>

      <div className="mb-4 flex items-center justify-between gap-3 px-1">
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className="press inline-flex h-9 items-center gap-2 rounded-full bg-white/[0.08] border border-white/[0.08] px-3.5 text-[13px] font-semibold text-[#D9C8CC]"
        >
          <span>{filter === 'all' ? 'All pieces' : LAYER_LABELS[filter]}</span>
          <ChevronDown
            size={14}
            className={filtersOpen ? 'rotate-180 transition-transform' : 'transition-transform'}
            style={{ color: '#FF86A0' }}
          />
        </button>
        <p className="text-oneui-cap text-[#FFD9DA]/45">
          {visible.length} shown · {SORTS.find((s) => s.id === sort)?.label}
        </p>
      </div>

      {filtersOpen && (
        <div className="glass-card p-3 mb-4 animate-oneui-fade">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#FF86A0] px-1 mb-2">
            Category
          </p>
          <div className="flex flex-wrap gap-2">
            <OneUIChip active={filter === 'all'} onClick={() => setFilter('all')}>
              All · {items.length}
            </OneUIChip>
            {presentLayers.map((l) => (
              <OneUIChip key={l} active={filter === l} onClick={() => setFilter(l)}>
                {LAYER_LABELS[l]}
              </OneUIChip>
            ))}
          </div>

          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#FF86A0] px-1 mt-4 mb-2">
            Sort
          </p>
          <div className="flex flex-wrap gap-2">
            {SORTS.map((s) => (
              <OneUIChip key={s.id} active={sort === s.id} onClick={() => setSort(s.id)}>
                {s.label}
              </OneUIChip>
            ))}
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="text-center text-fog-400 text-oneui-body py-10">
          {items.length === 0 ? 'No items yet. Tap the + button to add your first piece.' : 'No pieces match this view.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {visible.map((it, idx) => (
            <ItemCard key={it.id} item={it} priority={idx < 2} />
          ))}
        </div>
      )}
    </div>
  );
}
