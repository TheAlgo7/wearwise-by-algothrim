'use client';

import { OneUIChip, OneUIHeader } from '@/components/oneui';
import { useIsOwner } from '@/components/RoleProvider';
import { SaveLookSheet } from '@/components/SaveLookSheet';
import { useSeason } from '@/hooks/useSeason';
import { cn } from '@/lib/cn';
import { LAYER_TYPES, type LayerType } from '@/lib/constants';
import { SEASON_META, itemSuitsSeason } from '@/lib/season';
import { createClient } from '@/lib/supabase/client';
import type { Item } from '@/types';
import { Check, Heart, Search, Shirt, X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Build a look, piece by piece.
 *
 * Ishita's main screen. She walks the same shelves he does, taps pieces to add
 * them, and sends the result with a note. The tray at the bottom is always
 * visible so she can see the outfit taking shape without scrolling back.
 */

const PICK_ORDER: LayerType[] = ['base', 'mid', 'outer', 'bottom', 'footwear', 'headwear', 'eyewear', 'timepiece', 'jewelry', 'accessory'];

const PICK_LABELS: Record<LayerType, string> = {
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

export default function StylePage() {
  const router = useRouter();
  const isOwner = useIsOwner();
  const { season } = useSeason(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [seasonOnly, setSeasonOnly] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sent, setSent] = useState(false);

  const load = useCallback(async (signal: AbortSignal) => {
    const supa = createClient();
    const { data, error } = await supa
      .from('items')
      .select('*, category:categories(*)')
      .eq('archived', false)
      .abortSignal(signal);
    if (signal.aborted) return;
    setLoadError(Boolean(error));
    if (!error) setItems((data ?? []) as Item[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const pool = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (seasonOnly && !itemSuitsSeason(it, season)) return false;
      if (!q) return true;
      return [it.name, it.category?.name, it.primary_color, ...it.vibe].filter(Boolean).some((v) =>
        String(v).toLowerCase().includes(q)
      );
    });
  }, [items, query, season, seasonOnly]);

  const shelves = useMemo(() => {
    const grouped = new Map<LayerType, Item[]>();
    for (const it of pool) {
      const layer = it.category?.layer_type;
      if (!layer || !LAYER_TYPES.includes(layer)) continue;
      const bucket = grouped.get(layer);
      if (bucket) bucket.push(it);
      else grouped.set(layer, [it]);
    }
    return PICK_ORDER.filter((l) => grouped.has(l)).map((l) => ({
      layer: l,
      label: PICK_LABELS[l],
      items: grouped.get(l) ?? [],
    }));
  }, [pool]);

  // Gaurav can reach this page too; it doubles as his manual outfit builder.
  const audience = isOwner ? 'owner' : 'partner';

  if (sent) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-8 text-center">
        <div className="flex h-16 w-16 animate-heart-in items-center justify-center rounded-full bg-crimson-400/15">
          <Heart size={28} className="fill-current text-crimson-300" aria-hidden />
        </div>
        <h1 className="text-oneui-h text-crimson-50">
          {audience === 'partner' ? 'Sent to Gaurav' : 'Look saved'}
        </h1>
        <p className="text-oneui-body text-fog-300 text-pretty">
          {audience === 'partner'
            ? 'It is on his home screen now.'
            : 'It is on your shelf under Looks.'}
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => { setSent(false); setSelected([]); }}
            className="press min-h-[48px] rounded-full bg-crimson-400 px-6 text-[15px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
          >
            Build another
          </button>
          <button
            type="button"
            onClick={() => router.push('/looks')}
            className="press min-h-[48px] rounded-full px-6 text-[15px] font-semibold text-crimson-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
          >
            See all looks
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh">
      <OneUIHeader
        eyebrow={audience === 'partner' ? 'STYLE HIM' : 'BUILD A LOOK'}
        title={audience === 'partner' ? 'Pick his outfit' : 'Build it yourself'}
        subtitle={
          loading
            ? '—'
            : selected.length === 0
            ? 'Tap pieces to add them.'
            : `${selected.length} ${selected.length === 1 ? 'piece' : 'pieces'} chosen`
        }
      />

      <div className={cn('reach-zone', selected.length > 0 && 'pb-[calc(env(safe-area-inset-bottom)+220px)]')}>
        <div className="glass-card flex h-12 items-center gap-3 px-4">
          <Search size={17} className="shrink-0 text-crimson-300" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search his wardrobe"
            aria-label="Search his wardrobe"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-crimson-50 outline-none placeholder:text-fog-300"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="press -mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-fog-300"
            >
              <X size={16} aria-hidden />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <OneUIChip active={seasonOnly} onClick={() => setSeasonOnly(!seasonOnly)}>
            {SEASON_META[season].label} only
          </OneUIChip>
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => setSelected([])}
              className="press ml-auto min-h-8 rounded-full px-3 text-[12px] font-semibold text-fog-400 transition-colors hover:text-fog-200"
            >
              Clear all
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col gap-6">
            {Array.from({ length: 3 }).map((_, s) => (
              <div key={s}>
                <div className="mb-2 h-5 w-24 animate-pulse rounded-full bg-white/[0.05]" />
                <div className="flex gap-2.5">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-[132px] w-[100px] animate-pulse rounded-squircle bg-white/[0.05]" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div role="alert" className="rounded-[1.65rem] bg-ink-100 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold leading-5 text-fog-100">Couldn&apos;t load the wardrobe</p>
                <p className="mt-1 text-[13px] leading-5 text-fog-400">Check your connection and try again.</p>
              </div>
              <button
                type="button"
                onClick={() => { setLoading(true); void load(new AbortController().signal); }}
                className="min-h-[44px] shrink-0 rounded-full bg-crimson-400/[0.14] px-5 text-[13px] font-semibold text-crimson-200"
              >
                Retry
              </button>
            </div>
          </div>
        ) : shelves.length === 0 ? (
          <p className="py-10 text-center text-oneui-body text-fog-400">
            {query ? `Nothing matches “${query}”.` : 'Nothing to show for this season.'}
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            {shelves.map(({ layer, label, items: shelfItems }) => (
              <section key={layer} aria-label={label}>
                <div className="shelf-head">
                  <h2 className="text-[15px] font-semibold leading-5 text-crimson-50">{label}</h2>
                  <span className="text-[11px] font-medium text-fog-400">{shelfItems.length}</span>
                </div>
                <div className="shelf-rail">
                  {shelfItems.map((it) => {
                    const on = selected.includes(it.id);
                    return (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => toggle(it.id)}
                        aria-pressed={on}
                        className={cn(
                          'press relative w-[100px] shrink-0 overflow-hidden rounded-squircle border text-left transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400',
                          on ? 'border-crimson-400 bg-crimson-400/10' : 'border-white/[0.07] bg-ink-200'
                        )}
                      >
                        <div className="relative aspect-[3/4] bg-ink-0">
                          {it.image_url ? (
                            <Image
                              src={it.image_url}
                              alt={it.name}
                              fill
                              sizes="100px"
                              className="object-contain p-1"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Shirt size={22} className="text-fog-500" aria-hidden />
                            </div>
                          )}
                          {on && (
                            <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-crimson-400 text-white">
                              <Check size={14} strokeWidth={3} aria-hidden />
                            </span>
                          )}
                        </div>
                        <p className="truncate px-2 py-1.5 text-[11px] font-medium text-fog-200">{it.name}</p>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Tray — the outfit so far, pinned above the nav */}
      {selected.length > 0 && (
        <div
          className="fixed inset-x-0 z-40 animate-oneui-fade border-t border-white/[0.08]"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom) + 72px)',
            background: 'rgb(var(--ink-100) / 0.92)',
            backdropFilter: 'blur(28px) saturate(170%)',
            WebkitBackdropFilter: 'blur(28px) saturate(170%)',
          }}
        >
          <div className="mx-auto max-w-xl px-4 py-3">
            <div className="mb-2.5 flex gap-2 overflow-x-auto no-scrollbar">
              {selected.map((id) => {
                const it = itemById.get(id);
                if (!it) return null;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggle(id)}
                    aria-label={`Remove ${it.name}`}
                    className="press relative h-14 w-14 shrink-0 overflow-hidden rounded-[16px] border border-white/[0.1] bg-ink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
                  >
                    {it.image_url ? (
                      <Image src={it.image_url} alt={it.name} width={56} height={56} sizes="56px" className="h-full w-full object-contain" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center">
                        <Shirt size={18} className="text-fog-500" aria-hidden />
                      </span>
                    )}
                    <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-white">
                      <X size={10} strokeWidth={3} aria-hidden />
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="press flex min-h-[50px] w-full items-center justify-center gap-2 rounded-full bg-crimson-400 text-[15px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
            >
              <Heart size={16} className="fill-current" aria-hidden />
              {audience === 'partner' ? 'Send this to Gaurav' : 'Save this look'}
            </button>
          </div>
        </div>
      )}

      <SaveLookSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSaved={() => setSent(true)}
        items={selected}
        defaultSeason={season}
        withNote={audience === 'partner'}
        title={audience === 'partner' ? 'Send it to him' : 'Save this look'}
        cta={audience === 'partner' ? 'Send to Gaurav' : 'Save look'}
        context={{ season, built_by: audience }}
      />
    </main>
  );
}
