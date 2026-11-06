'use client';

import { ItemCard } from '@/components/ItemCard';
import { OneUIChip } from '@/components/oneui';
import { cn } from '@/lib/cn';
import { swatchFor } from '@/lib/colour-story';
import { LAYER_TYPES, type LayerType } from '@/lib/constants';
import { SEASON_META, itemSuitsSeason, type Season } from '@/lib/season';
import type { Item } from '@/types';
import { ArrowLeft, Search, SlidersHorizontal, X } from 'lucide-react';
import { useMemo, useState } from 'react';

interface Props {
  items: Item[];
  season: Season;
  /** When false the season filter is ignored and everything shows.
   *  The control that flips it lives in the season pill above, not here. */
  seasonFilterOn: boolean;
}

const SORT_KEY = 'wearwise.wardrobe.sort';

/**
 * Shelves are categories, not layer types.
 *
 * Grouping by layer put 21 button-down shirts under "Mid layers", which is
 * both wrong and useless: you cannot wear a mid layer on its own, and nobody
 * looking for a shirt thinks "I need a mid layer". A shirt is a shirt and a
 * tee is a tee. Layer order still decides the order the shelves appear in,
 * because that is the order you get dressed in.
 */
const LAYER_ORDER: LayerType[] = [
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

/** Plural display names for categories stored in the singular. */
const SHELF_LABELS: Record<string, string> = {
  'T-shirt': 'T-shirts',
  'Shirt': 'Shirts',
  'Polo': 'Polos',
  'Trousers': 'Trousers',
  'Jeans': 'Jeans',
  'Cargos': 'Cargos',
  'Shorts': 'Shorts',
  'Lounge & Pyjama': 'Lounge & pyjama',
  'Sneakers': 'Sneakers',
  'Boots': 'Boots',
  'Formal Shoes': 'Formal shoes',
  'Sandals / Slides': 'Sandals & slides',
  'Cap / Hat': 'Caps & hats',
  'Sunglasses': 'Sunglasses',
  'Watch': 'Watches',
  'Belt': 'Belts',
  'Tie': 'Ties',
  'Bandana / Scarf': 'Bandanas & scarves',
  'Sport Accessory': 'Sport',
  'Overshirt': 'Overshirts',
  'Jacket': 'Jackets',
  'Coat': 'Coats',
  'Blazer': 'Blazers',
  'Hoodie': 'Hoodies',
  'Sweatshirt': 'Sweatshirts',
  'Sweater / Knit': 'Knitwear',
  'Tank / Vest': 'Tanks & vests',
  'Joggers': 'Joggers',
};

function shelfLabel(name: string): string {
  return SHELF_LABELS[name] ?? name;
}

/** Sentence case for a stored colour: "olive green" reads "Olive green". */
function colourLabel(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// "Least worn" and "Most worn" are gone. times_worn is 0 on all 105 items and
// always will be: he does not log wears and has said he never intends to, so
// both sorts returned the list in an arbitrary order while claiming to mean
// something. Colour is what he actually browses by.
type SortKey = 'newest' | 'name' | 'color';

const SORTS: Array<{ id: SortKey; label: string }> = [
  { id: 'newest', label: 'Recent' },
  { id: 'name', label: 'A-Z' },
  { id: 'color', label: 'By colour' },
];

function sortItems(list: Item[], sort: SortKey): Item[] {
  return [...list].sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name);
    if (sort === 'color') {
      return (a.primary_color ?? 'zz').localeCompare(b.primary_color ?? 'zz') ||
        a.name.localeCompare(b.name);
    }
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

export function WardrobeShelves({ items, season, seasonFilterOn }: Props) {
  const [query, setQuery] = useState('');
  const [sort, setSortState] = useState<SortKey>(() => {
    if (typeof window === 'undefined') return 'newest';
    return (sessionStorage.getItem(SORT_KEY) as SortKey) ?? 'newest';
  });
  const [sortOpen, setSortOpen] = useState(false);
  /** When set, the view drills into one shelf as a full grid. */
  const [expanded, setExpanded] = useState<string | null>(null);
  /**
   * Browse by colour. Fashion first: colour decides his outfits, so "what do
   * I own in olive" deserves one tap, not a search for the word.
   */
  const [colour, setColour] = useState<string | null>(null);

  function setSort(val: SortKey) {
    sessionStorage.setItem(SORT_KEY, val);
    setSortState(val);
  }

  const inSeason = useMemo(
    () => (seasonFilterOn ? items.filter((it) => itemSuitsSeason(it, season)) : items),
    [items, season, seasonFilterOn]
  );

  // The colours he actually owns, most common first.
  const palette = useMemo(() => {
    const counts = new Map<string, number>();
    for (const it of inSeason) {
      const c = it.primary_color?.trim().toLowerCase();
      if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count, hex: swatchFor(name) }));
  }, [inSeason]);

  // A colour picked under one season can vanish under another; drop it then
  // rather than showing an empty grid with a chip row that no longer has it.
  const activeColour = colour && palette.some((p) => p.name === colour) ? colour : null;

  const inColour = useMemo(
    () => (activeColour ? inSeason.filter((it) => it.primary_color?.trim().toLowerCase() === activeColour) : inSeason),
    [inSeason, activeColour]
  );

  const q = query.trim().toLowerCase();
  const searchResults = useMemo(
    () => (q ? sortItems(inColour.filter((it) => matchesQuery(it, q)), sort) : []),
    [inColour, q, sort]
  );

  const shelves = useMemo(() => {
    const grouped = new Map<string, { key: string; label: string; layer: LayerType; items: Item[] }>();
    for (const it of inSeason) {
      const cat = it.category;
      if (!cat?.layer_type || !LAYER_TYPES.includes(cat.layer_type)) continue;
      const key = cat.id ?? cat.name;
      const bucket = grouped.get(key);
      if (bucket) bucket.items.push(it);
      else grouped.set(key, { key, label: shelfLabel(cat.name), layer: cat.layer_type, items: [it] });
    }
    return [...grouped.values()]
      .map((s) => ({ ...s, items: sortItems(s.items, sort) }))
      // Dressing order first, then the fuller shelf, then alphabetical.
      .sort(
        (a, b) =>
          LAYER_ORDER.indexOf(a.layer) - LAYER_ORDER.indexOf(b.layer) ||
          b.items.length - a.items.length ||
          a.label.localeCompare(b.label)
      );
  }, [inSeason, sort]);

  // Items with a category whose layer_type is missing from LAYER_TYPES would
  // silently vanish; surface them rather than losing them.
  const orphans = useMemo(
    () => inSeason.filter((it) => !it.category?.layer_type || !LAYER_TYPES.includes(it.category.layer_type)),
    [inSeason]
  );

  const controls = (
    <>
      {/* Sticky so search stays reachable however far down the shelves you are. */}
      <div className="sticky top-0 z-30 -mx-4 mb-4 bg-ink-0 px-4 pb-2 pt-2">
        <div className="flex items-center gap-2">
          <div className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-full border border-white/[0.10] px-4 transition-colors focus-within:border-white/[0.22]">
            <Search size={17} className="shrink-0 text-fog-400" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search wardrobe"
              aria-label="Search wardrobe"
              className="min-w-0 flex-1 bg-transparent text-[15px] text-fog-100 outline-none placeholder:text-fog-400"
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
          <button
            type="button"
            onClick={() => setSortOpen((v) => !v)}
            aria-expanded={sortOpen}
            aria-label={`Sort: ${SORTS.find((s) => s.id === sort)?.label}`}
            className={cn(
              'press flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400',
              sortOpen
                ? 'border-white/[0.16] bg-ink-500 text-fog-100'
                : 'border-white/[0.10] text-fog-200 hover:border-white/[0.18]'
            )}
          >
            <SlidersHorizontal size={17} aria-hidden />
          </button>
        </div>

        {sortOpen && (
          <div className="animate-oneui-fade mt-2 flex flex-wrap gap-2">
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
        )}
      </div>

      {/* Every colour he owns, as a row of swatches. Tap one to see all of it. */}
      {palette.length > 1 && (
        <div role="group" aria-label="Browse by colour" className="chip-row -mt-1 mb-4">
          {palette.map((p) => {
            const on = activeColour === p.name;
            return (
              <button
                key={p.name}
                type="button"
                aria-pressed={on}
                onClick={() => setColour(on ? null : p.name)}
                className={cn(
                  'press inline-flex h-10 shrink-0 items-center gap-2 rounded-full border pl-2 pr-3.5 text-[13px] font-semibold transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400',
                  on ? 'border-white/[0.24] bg-ink-500 text-fog-100' : 'border-white/[0.10] text-fog-300 hover:border-white/[0.18] hover:text-fog-100'
                )}
              >
                <span
                  aria-hidden
                  className="h-6 w-6 rounded-full ring-1 ring-inset ring-white/[0.18]"
                  style={{ background: p.hex ?? 'rgb(var(--fog-500))' }}
                />
                {colourLabel(p.name)}
                <span className="tabular-nums text-fog-400">{p.count}</span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );

  // ── Drilled into one shelf ──
  if (expanded) {
    const shelf = shelves.find((s) => s.key === expanded);
    return (
      <div>
        <button
          type="button"
          onClick={() => setExpanded(null)}
          className="press mb-3 inline-flex min-h-[48px] items-center gap-2 rounded-full pr-3 text-[15px] font-semibold text-fog-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
        >
          <ArrowLeft size={18} aria-hidden />
          All shelves
        </button>
        <div className="mb-3 flex items-baseline justify-between px-1">
          <h2 className="text-oneui-h text-fog-100">{shelf?.label ?? 'Shelf'}</h2>
          <p className="section-meta">{shelf?.items.length ?? 0} pieces</p>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-5">
          {(shelf?.items ?? []).map((it, idx) => (
            <ItemCard key={it.id} item={it} priority={idx < 2} />
          ))}
        </div>
      </div>
    );
  }

  // ── One colour, everything he owns in it ──
  if (activeColour && !q) {
    const pieces = sortItems(inColour, sort);
    return (
      <div>
        {controls}
        <div className="mb-3 flex items-baseline justify-between px-1">
          <h2 className="text-oneui-h text-fog-100">{colourLabel(activeColour)}</h2>
          <button
            type="button"
            onClick={() => setColour(null)}
            className="press inline-flex min-h-[36px] items-center rounded-full px-2 text-[12px] font-semibold text-fog-300 transition-colors hover:text-fog-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
          >
            {pieces.length} {pieces.length === 1 ? 'piece' : 'pieces'} · Clear
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-5">
          {pieces.map((it, idx) => (
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
            <p className="mb-3 px-1 section-meta">
              {searchResults.length} {searchResults.length === 1 ? 'match' : 'matches'}
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-5">
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
          {shelves.map(({ key, label, items: shelfItems }, i) => (
            <section
              key={key}
              aria-label={label}
              className="animate-shelf-in"
              style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
            >
              <div className="shelf-head">
                <h2 className="text-[17px] font-semibold leading-6 text-fog-100">{label}</h2>
                <button
                  type="button"
                  onClick={() => setExpanded(key)}
                  className="press inline-flex min-h-[36px] shrink-0 items-center rounded-full px-2 text-[12px] font-semibold text-fog-300 transition-colors hover:text-fog-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
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
                    className="w-[128px] shrink-0"
                  />
                ))}
                {shelfItems.length > 12 && (
                  <button
                    type="button"
                    onClick={() => setExpanded(key)}
                    className={cn(
                      'press flex aspect-[4/5] w-[128px] shrink-0 flex-col items-center justify-center gap-1 rounded-[18px]',
                      'border border-white/[0.10] text-fog-200 transition-colors hover:border-white/[0.18]',
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
                <h2 className="text-[17px] font-semibold leading-6 text-fog-100">Uncategorised</h2>
                <span className="section-meta">{orphans.length}</span>
              </div>
              <div className="shelf-rail">
                {orphans.map((it) => (
                  <ItemCard key={it.id} item={it} className="w-[128px] shrink-0" />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
