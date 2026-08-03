'use client';

import { LookCard } from '@/components/LookCard';
import { OneUIChip, OneUIHeader, Squircle } from '@/components/oneui';
import { useIsOwner } from '@/components/RoleProvider';
import { useSeason } from '@/hooks/useSeason';
import { createClient } from '@/lib/supabase/client';
import { SEASONS, SEASON_META, type Season } from '@/lib/season';
import type { Item, Outfit } from '@/types';
import { Heart, Shirt } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Filter = Season | 'all';

export default function LooksPage() {
  const isOwner = useIsOwner();
  const { season } = useSeason(null);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [itemById, setItemById] = useState<Map<string, Item>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [wearingId, setWearingId] = useState<string | null>(null);
  const [wornIds, setWornIds] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);

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

  const history = useMemo(
    () => outfits.filter((o) => o.worn_at).slice(0, 30),
    [outfits]
  );

  const wear = useCallback(
    async (look: Outfit) => {
      setWearingId(look.id);
      setActionError(null);
      try {
        const res = await fetch('/api/wear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: look.items,
            reasoning: look.name ? `Wore the saved look "${look.name}".` : look.ai_reasoning ?? undefined,
            confidence: look.confidence ?? undefined,
            context: { ...look.context, mode: 'saved-look' },
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
    const previous = outfits;
    setOutfits((prev) => prev.filter((o) => o.id !== look.id));
    const res = await fetch(`/api/looks?id=${look.id}`, { method: 'DELETE' }).catch(() => null);
    if (!res?.ok) {
      setOutfits(previous); // put it back rather than pretend it went
      setActionError('Could not delete that look.');
    }
  }, [outfits]);

  return (
    <main className="min-h-dvh pb-4">
      <OneUIHeader
        eyebrow="LOOKS"
        title={isOwner ? 'Saved looks' : 'Looks for him'}
        subtitle={loading || loadError ? '—' : `${saved.length} saved · ${history.length} worn`}
      />

      <div className="reach-zone">
        {/* Season filter */}
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
                className="min-h-[44px] shrink-0 rounded-full bg-crimson-400/[0.14] px-5 text-[13px] font-semibold text-crimson-200 transition-colors hover:bg-crimson-400/[0.22]"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* From Ishita */}
            {picks.length > 0 && (
              <section aria-label="Looks from Ishita" className="flex flex-col gap-3">
                <div className="flex items-center gap-2 px-1 pt-1">
                  <Heart size={14} className="fill-current text-crimson-300" aria-hidden />
                  <h2 className="text-oneui-cap font-semibold uppercase tracking-widest text-crimson-300">
                    {isOwner ? 'From Ishita' : 'You picked these'}
                  </h2>
                </div>
                {filtered(picks).map((look) => (
                  <LookCard
                    key={look.id}
                    look={look}
                    itemById={itemById}
                    canManage={isOwner}
                    worn={wornIds.has(look.id)}
                    wearing={wearingId === look.id}
                    onWear={isOwner ? () => wear(look) : undefined}
                    onDelete={isOwner ? () => remove(look) : undefined}
                  />
                ))}
              </section>
            )}

            {/* Saved shelf */}
            <section aria-label="Saved looks" className="flex flex-col gap-3">
              <h2 className="px-1 pt-2 text-oneui-cap font-semibold uppercase tracking-widest text-crimson-300">
                {isOwner ? 'Your shelf' : 'His shelf'}
              </h2>
              {filtered(mine).length === 0 ? (
                <p className="px-1 py-6 text-oneui-body text-fog-400">
                  {mine.length === 0
                    ? 'No saved looks yet. Generate a fit and tap Save to name one.'
                    : `Nothing saved for ${filter === 'all' ? 'this filter' : SEASON_META[filter as Season].label.toLowerCase()}.`}
                </p>
              ) : (
                filtered(mine).map((look) => (
                  <LookCard
                    key={look.id}
                    look={look}
                    itemById={itemById}
                    canManage={isOwner}
                    worn={wornIds.has(look.id)}
                    wearing={wearingId === look.id}
                    onWear={isOwner ? () => wear(look) : undefined}
                    onDelete={isOwner ? () => remove(look) : undefined}
                  />
                ))
              )}
            </section>

            {/* History — owner only; she does not need his wear log */}
            {isOwner && history.length > 0 && (
              <section aria-label="Wear history" className="flex flex-col gap-3">
                <h2 className="px-1 pt-4 text-oneui-cap font-semibold uppercase tracking-widest text-crimson-300">
                  Recently worn
                </h2>
                {history.map((o) => (
                  <Squircle key={o.id} variant="flat" className="p-3">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                      {o.items.map((id) => {
                        const it = itemById.get(id);
                        return (
                          <div
                            key={id}
                            className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-squircle-sm bg-ink-300"
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
                    <div className="mt-2 flex items-center justify-between text-oneui-cap text-fog-300">
                      <span>
                        {new Date(o.worn_at ?? o.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                      <span>
                        {o.context?.mode && <span className="mr-2">{o.context.mode}</span>}
                        {o.context?.temp_c !== undefined && <span>{Math.round(o.context.temp_c)}°</span>}
                      </span>
                    </div>
                  </Squircle>
                ))}
              </section>
            )}

            {saved.length === 0 && history.length === 0 && (
              <p className="py-10 text-center text-oneui-body text-fog-400">
                Nothing here yet. Generate a fit on the{' '}
                <Link className="text-crimson-300 underline" href="/">Today</Link> tab and save it.
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
