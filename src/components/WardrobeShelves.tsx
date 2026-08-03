'use client';

import { ItemCard } from '@/components/ItemCard';
import { OneUIChip } from '@/components/oneui';
import { cn } from '@/lib/cn';
import { LAYER_TYPES, type LayerType } from '@/lib/constants';
import { SEASON_META, itemSuitsSeason, type Season } from '@/lib/season';
import type { Item } from '@/types';
import { ArrowLeft, Search, SlidersHorizontal, X } from 'lucide-react';
import { useMemo, useState } from 'react';

interface Props {
  items: Item[];
  season: Season;
  /** When false the season filter is ignored and everything shows. */
  seasonFilterOn: boolean;
  onSeasonFilterChange: (on: boolean) => void;
}

const SORT_KEY = 'wearwise.wardrobe.sort';

/**
 * Shelf order is deliberate: the pieces a look is built around come first,
 * finishing touches last. It is the order you actually get dressed in.
 */
const SHELF_ORDER: LayerType[] = [
  'base',
  'mid',
  'outer',
  'bottom',
  'footwear',
  'headwear',
  'eyewear',
  'timepiece',
  'jewelry',
  'accessory',
];

const SHELF_LABELS: Record<LayerType, string> = {
  base: 'Tops',
  mid: 'Mid layers',
  outer: 'Outerwear',
  bottom: 'Bottoms',
  footwear: 'Shoes',
  accessory: 'Accessories',
  headwear: 'Headwear',
  eyewear: 'Eyewear',
  timepiece: 'Watches',
  jewelry: 'Jewellery',
};

type SortKey = 'newest' | 'least-worn' | 'most-worn' | 'name';

const SORTS: Array<{ id: SortKey; label: string }> = [
  { id: 'newest', label: 'Recent' },
  { id: 'least-worn', label: 'Least worn' },
  { id: 'most-worn', label: 'Most worn' },
  { id: 'name', label: 'A-Z' },
];

function sortItems(list: Item[], sort: SortKey): Item[] {
  return [...list].sort((a, b) => {
    if (sort === 'least-worn') return (a.times_worn ?? 0) - (b.times_worn ?? 0);
    if (sort === 'most-worn') return (b.times_worn ?? 0) - (a.times_worn ?? 0);
    if (sort === 'name') return a.name.localeCompare(b.name);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

function matchesQuery(it: Item, q: string): boolean {
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
}

export function WardrobeShelves({ items, season, seasonFilterOn, onSeasonFilterChange }: Props) {
  const [query, setQuery] = useState('');
  const [sort, setSortState] = useState<SortKey>(() => {
    if (typeof window === 'undefined') return 'newest';
    return (sessionStorage.getItem(SORT_KEY) as SortKey) ?? 'newest';
  });
  const [sortOpen, setSortOpen] = useState(false);
  /** When set, the view drills into one shelf as a full grid. */
  const [expanded, setExpanded] = useState<LayerType | null>(null);

  function setSort(val: SortKey) {
    sessionStorage.setItem(SORT_KEY, val);
    setSortState(val);
  }

  const inSeason = useMemo(
    () => (seasonFilterOn ? items.filter((it) => itemSuitsSeason(it, season)) : items),
    [items, season, seasonFilterOn]
  );

  const hiddenBySeason = items.length - inSeason.length;

  const q = query.trim().toLowerCase();
  const searchResults = useMemo(
    () => (q ? sortItems(inSeason.filter((it) => matchesQuery(it, q)), sort) : []),
    [inSeason, q, sort]
  );

  const shelves = useMemo(() => {
    const grouped = new Map<LayerType, Item[]>();
    for (const it of inSeason) {
      const layer = it.category?.layer_type;
      if (!layer) continue;
      const bucket = grouped.get(layer);
      if (bucket) bucket.push(it);
      else grouped.set(layer, [it]);
    }
    return SHELF_ORDER.filter((l) => grouped.has(l)).map((l) => ({
      layer: l,
      label: SHELF_LABELS[l],
      items: sortItems(grouped.get(l) ?? [], sort),
    }));
  }, [inSeason, sort]);

  // Items with a category whose layer_type is missing from LAYER_TYPES would
  // silently vanish; surface them rather than losing them.
  const orphans = useMemo(
    () => inSeason.filter((it) => !it.category?.layer_type || !LAYER_TYPES.includes(it.category.layer_type)),
    [inSeason]
  );

  const controls = (
    <>
      <div className="glass-card mb-3 flex h-12 items-center gap-3 px-4">
        <Search size={17} className="shrink-0 text-crimson-300" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search wardrobe"
          aria-label="Search wardrobe"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-crimson-50 outline-none placeholder:text-fog-300"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="press -mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-fog-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
          >
            <X size={16} aria-hidden />
          </button>
        )}
      </div>

      <div className="mb-4 flex items-center gap-2">
        <OneUIChip active={seasonFilterOn} onClick={() => onSeasonFilterChange(!seasonFilterOn)}>
          {SEASON_META[season].label} only
        </OneUIChip>
        {seasonFilterOn && hiddenBySeason > 0 && (
          <span className="text-[11px] font-medium text-fog-400">{hiddenBySeason} put away</span>
        )}
        <button
          type="button"
          onClick={() => setSortOpen((v) => !v)}
          aria-expanded={sortOpen}
          className="press ml-auto inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.06] px-3.5 text-[13px] font-semibold text-fog-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
        >
          <SlidersHorizontal size={14} className="text-crimson-300" aria-hidden />
          {SORTS.find((s) => s.id === sort)?.label}
        </button>
      </div>

      {sortOpen && (
        <div className="glass-card mb-4 animate-oneui-fade p-3">
          <div className="flex flex-wrap gap-2">
            {SORTS.map((s) => (
              <OneUIChip
                key={s.id}
                active={sort === s.id}
                onClick={() => {
                  setSort(s.id);
                  setSortOpen(false);
                }}
              >
                {s.label}
              </OneUIChip>
            ))}
          </div>
        </div>
      )}
    </>
  );

  // ── Drilled into one shelf ──
  if (expanded) {
    const shelf = shelves.find((s) => s.layer === expanded);
    return (
      <div>
        <button
          type="button"
          onClick={() => setExpanded(null)}
          className="press mb-3 inline-flex min-h-[44px] items-center gap-2 rounded-full pr-3 text-[15px] font-semibold text-crimson-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
        >
          <ArrowLeft size={18} aria-hidden />
          All shelves
        </button>
        <div className="mb-3 flex items-baseline justify-between px-1">
          <h2 className="text-oneui-h text-crimson-50">{shelf?.label ?? 'Shelf'}</h2>
          <p className="text-oneui-cap text-crimson-100/45">{shelf?.items.length ?? 0} pieces</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(shelf?.items ?? []).map((it, idx) => (
            <ItemCard key={it.id} item={it} priority={idx < 2} />
          ))}
        </div>
      </div>
    );
  }

  // ── Search results ──
  if (q) {
    return (
      <div>
        {controls}
        {searchResults.length === 0 ? (
          <p className="py-10 text-center text-oneui-body text-fog-400">
            Nothing matches “{query}”.
          </p>
        ) : (
          <>
            <p className="mb-3 px-1 text-oneui-cap text-crimson-100/45">
              {searchResults.length} {searchResults.length === 1 ? 'match' : 'matches'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {searchResults.map((it, idx) => (
                <ItemCard key={it.id} item={it} priority={idx < 2} />
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Shelves ──
  return (
    <div>
      {controls}

      {shelves.length === 0 ? (
        <p className="py-10 text-center text-oneui-body text-fog-400">
          {items.length === 0
            ? 'No items yet. Tap the plus button to add your first piece.'
            : `Nothing tagged for ${SEASON_META[season].label.toLowerCase()} yet.`}
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {shelves.map(({ layer, label, items: shelfItems }, i) => (
            <section
              key={layer}
              aria-label={label}
              className="animate-shelf-in"
              style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
            >
              <div className="shelf-head">
                <h2 className="text-[17px] font-semibold leading-6 text-crimson-50">{label}</h2>
                <button
                  type="button"
                  onClick={() => setExpanded(layer)}
                  className="press shrink-0 rounded-full px-2 py-1 text-[12px] font-semibold text-crimson-100/55 transition-colors hover:text-crimson-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
                >
                  {shelfItems.length} · See all
                </button>
              </div>
              <div className="shelf-rail">
                {shelfItems.slice(0, 12).map((it, idx) => (
                  <ItemCard
                    key={it.id}
                    item={it}
                    priority={i === 0 && idx < 3}
                    className="w-[116px] shrink-0"
                  />
                ))}
                {shelfItems.length > 12 && (
                  <button
                    type="button"
                    onClick={() => setExpanded(layer)}
                    className={cn(
                      'press flex w-[116px] shrink-0 flex-col items-center justify-center gap-1 rounded-squircle',
                      'border border-dashed border-white/[0.12] text-crimson-200',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400'
                    )}
                  >
                    <span className="text-[19px] font-semibold">+{shelfItems.length - 12}</span>
                    <span className="text-[11px] font-medium text-fog-400">more</span>
                  </button>
                )}
              </div>
            </section>
          ))}

          {orphans.length > 0 && (
            <section aria-label="Uncategorised">
              <div className="shelf-head">
                <h2 className="text-[17px] font-semibold leading-6 text-crimson-50">Uncategorised</h2>
                <span className="text-[12px] font-semibold text-crimson-100/55">{orphans.length}</span>
              </div>
              <div className="shelf-rail">
                {orphans.map((it) => (
                  <ItemCard key={it.id} item={it} className="w-[116px] shrink-0" />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
