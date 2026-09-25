'use client';

import { LookSheet, LookTile } from '@/components/LookCard';
import { OneUIChip, OneUIHeader, Squircle } from '@/components/oneui';
import { useIsOwner } from '@/components/RoleProvider';
import { useSeason } from '@/hooks/useSeason';
import { cn } from '@/lib/cn';
import { createClient } from '@/lib/supabase/client';
import { SEASONS, SEASON_META, type Season } from '@/lib/season';
import { modeLabel } from '@/lib/today-context';
import type { Item, Outfit } from '@/types';
import { Check, Heart, Loader2, RotateCcw, Shirt } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Filter = Season | 'all';
type Tab = 'saved' | 'history';

/**
 * Two tools, not one feed.
 *
 * Saved inspiration and the wear log were stacked on one page: her picks, then
 * his shelf, then a month of history, all scrolling into each other. They
 * answer different questions ("what should I wear" versus "what did I wear"),
 * so they get a segmented control and stop competing for the same screen.
 */
export default function LooksPage() {
  const isOwner = useIsOwner();
  const { season } = useSeason(null);
  const [tab, setTab] = useState<Tab>('saved');
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [itemById, setItemById] = useState<Map<string, Item>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [wearingId, setWearingId] = useState<string | null>(null);
  const [wornIds, setWornIds] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supa = createClient();
    const [{ data: o, error: oErr }, { data: i, error: iErr }] = await Promise.all([
      supa.from('outfits').select('*').order('created_at', { ascending: false }).limit(120),
      supa.from('items').select('*, category:categories(*)'),
    ]);
    const failed = Boolean(oErr || iErr);
    setLoadError(failed);
    if (!failed) {
      setOutfits((o ?? []) as Outfit[]);
      setItemById(new Map(((i ?? []) as Item[]).map((x) => [x.id, x])));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const saved = useMemo(
    () => outfits.filter((o) => o.is_preset || (o.is_saved && o.name)),
    [outfits]
  );

  const picks = useMemo(() => saved.filter((o) => o.created_by === 'partner'), [saved]);
  const mine = useMemo(() => saved.filter((o) => o.created_by !== 'partner'), [saved]);

  const filtered = useCallback(
    (list: Outfit[]) => (filter === 'all' ? list : list.filter((o) => o.season === filter || o.season === null)),
    [filter]
  );

  const history = useMemo(() => outfits.filter((o) => o.worn_at).slice(0, 30), [outfits]);

  const wear = useCallback(
    async (look: Outfit, label?: string) => {
      setWearingId(look.id);
      setActionError(null);
      try {
        const res = await fetch('/api/wear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: look.items,
            reasoning: label ?? (look.name ? `Wore the saved look "${look.name}".` : look.ai_reasoning ?? undefined),
            confidence: look.confidence ?? undefined,
            context: { ...look.context, mode: look.context?.mode ?? 'saved-look' },
          }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
        setWornIds((prev) => new Set(prev).add(look.id));
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Could not log that.');
      } finally {
        setWearingId(null);
      }
    },
    []
  );

  const remove = useCallback(async (look: Outfit) => {
    setActionError(null);
    setOpenId(null);
    const previous = outfits;
    setOutfits((prev) => prev.filter((o) => o.id !== look.id));
    const res = await fetch(`/api/looks?id=${look.id}`, { method: 'DELETE' }).catch(() => null);
    if (!res?.ok) {
      setOutfits(previous); // put it back rather than pretend it went
      setActionError('Could not delete that look.');
    }
  }, [outfits]);

  const showTabs = isOwner && history.length > 0;
  const activeTab: Tab = showTabs ? tab : 'saved';

  return (
    <main className="min-h-dvh pb-4">
      <OneUIHeader
        title={isOwner ? 'Looks' : 'Looks for him'}
        subtitle={
          loading || loadError
            ? undefined
            : isOwner
            ? `${saved.length} saved, ${history.length} worn`
            : `${picks.length} you sent, ${mine.length} of his`
        }
      />

      <div className="reach-zone">
        {showTabs && (
          <div role="tablist" aria-label="Looks view" className="seg grid-cols-2">
            {(['saved', 'history'] as Tab[]).map((t) => (
              <button
                key={t}
                role="tab"
                type="button"
                aria-selected={activeTab === t}
                onClick={() => setTab(t)}
                className="seg-item"
              >
                {t === 'saved' ? 'Saved' : 'History'}
              </button>
            ))}
          </div>
        )}

        {actionError && (
          <div role="alert" className="rounded-[1.5rem] border border-error-border bg-error/40 px-4 py-3 text-oneui-body text-error-text">
            {actionError}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-squircle bg-white/[0.05]" />
            ))}
          </div>
        ) : loadError ? (
          <div role="alert" className="rounded-[1.65rem] bg-ink-100 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold leading-5 text-fog-100">Couldn&apos;t load your looks</p>
                <p className="mt-1 text-[13px] leading-5 text-fog-400">Check your connection and try again.</p>
              </div>
              <button
                type="button"
                onClick={() => { setLoading(true); void load(); }}
                className="min-h-[48px] shrink-0 rounded-full bg-crimson-400/[0.14] px-5 text-[13px] font-semibold text-crimson-200 transition-colors hover:bg-crimson-400/[0.22]"
              >
                Retry
              </button>
            </div>
          </div>
        ) : activeTab === 'saved' ? (
          <>
            <div className="chip-row">
              <OneUIChip active={filter === 'all'} onClick={() => setFilter('all')}>
                All
              </OneUIChip>
              {SEASONS.map((s) => (
                <OneUIChip key={s} active={filter === s} onClick={() => setFilter(s)}>
                  {SEASON_META[s].label}
                  {s === season ? ' · now' : ''}
                </OneUIChip>
              ))}
            </div>

            {filtered(picks).length > 0 && (
              <section aria-label="Looks from Ishita" className="flex flex-col gap-3">
                <div className="shelf-head mb-0 pt-1">
                  <h2 className="section-title flex items-center gap-2">
                    <Heart size={14} className="fill-current text-crimson-300" aria-hidden />
                    {isOwner ? 'From Ishita' : 'You picked these'}
                  </h2>
                  <span className="section-meta">{filtered(picks).length}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-5">
                  {filtered(picks).map((look, i) => (
                    <LookTile
                      key={look.id}
                      look={look}
                      index={i}
                      itemById={itemById}
                      worn={wornIds.has(look.id)}
                      onOpen={() => setOpenId(look.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            <section aria-label="Saved looks" className="flex flex-col gap-3">
              <div className="shelf-head mb-0 pt-2">
                <h2 className="section-title">{isOwner ? 'Your looks' : 'His shelf'}</h2>
                {filtered(mine).length > 0 && <span className="section-meta">{filtered(mine).length}</span>}
              </div>
              {filtered(mine).length === 0 ? (
                <p className="px-1 py-6 text-oneui-body text-fog-400">
                  {mine.length === 0
                    ? 'Nothing saved yet. Tap the bookmark on today’s fit to keep one.'
                    : `Nothing saved for ${filter === 'all' ? 'this filter' : SEASON_META[filter as Season].label.toLowerCase()}.`}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-x-3 gap-y-5">
                  {filtered(mine).map((look, i) => (
                    <LookTile
                      key={look.id}
                      look={look}
                      index={i}
                      itemById={itemById}
                      worn={wornIds.has(look.id)}
                      onOpen={() => setOpenId(look.id)}
                    />
                  ))}
                </div>
              )}
            </section>

            {saved.length === 0 && (
              <p className="py-10 text-center text-oneui-body text-fog-400">
                Nothing here yet. Save a fit from the{' '}
                <Link className="text-crimson-300 underline" href="/">Today</Link> tab.
              </p>
            )}
          </>
        ) : (
          <section aria-label="Wear history" className="flex flex-col gap-3">
            {history.map((o) => {
              const worn = new Date(o.worn_at ?? o.created_at);
              const repeated = wornIds.has(o.id);
              return (
                <Squircle key={o.id} variant="flat" className="p-3">
                  <div className="mb-2 flex items-baseline justify-between gap-3 px-0.5">
                    <p className="text-[14px] font-semibold text-fog-100">
                      {worn.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                    <p className="section-meta">
                      {worn.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>

                  <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {o.items.map((id) => {
                      const it = itemById.get(id);
                      return (
                        <div
                          key={id}
                          className="photo-well flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-squircle-sm"
                        >
                          {it?.image_url ? (
                            <Image src={it.image_url} alt={it.name} width={64} height={64} sizes="64px" className="h-full w-full object-contain" />
                          ) : (
                            <Shirt size={20} className="text-fog-500" aria-hidden />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-2.5 flex items-center justify-between gap-3 px-0.5">
                    <p className="min-w-0 truncate text-[12px] font-medium text-fog-400">
                      {[
                        o.context?.mode ? modeLabel(o.context.mode) : null,
                        o.context?.city,
                        o.context?.temp_c !== undefined && o.context?.temp_c !== null
                          ? `${Math.round(o.context.temp_c)}°`
                          : null,
                        o.context?.condition,
                      ].filter(Boolean).join(' · ')}
                    </p>
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => void wear(o, 'Repeated an outfit from the wear log.')}
                        disabled={wearingId === o.id || repeated}
                        className={cn(
                          'press inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400 disabled:opacity-70',
                          repeated ? 'bg-white/[0.07] text-fog-200' : 'bg-crimson-400/[0.16] text-crimson-200'
                        )}
                      >
                        {wearingId === o.id ? (
                          <><Loader2 size={14} className="animate-spin" aria-hidden /> Logging</>
                        ) : repeated ? (
                          <><Check size={14} aria-hidden /> Logged</>
                        ) : (
                          <><RotateCcw size={14} aria-hidden /> Wear again</>
                        )}
                      </button>
                    )}
                  </div>
                </Squircle>
              );
            })}
          </section>
        )}
      </div>

      {(() => {
        const open = openId ? outfits.find((o) => o.id === openId) ?? null : null;
        return (
          <LookSheet
            look={open}
            itemById={itemById}
            canManage={isOwner}
            worn={open ? wornIds.has(open.id) : false}
            wearing={open ? wearingId === open.id : false}
            onClose={() => setOpenId(null)}
            onWear={isOwner && open ? () => void wear(open) : undefined}
            onDelete={isOwner && open ? () => void remove(open) : undefined}
          />
        );
      })()}
    </main>
  );
}
