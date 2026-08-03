'use client';

import { OneUIButton, OneUIHeader } from '@/components/oneui';
import { useIsOwner } from '@/components/RoleProvider';
import { SeasonSwitch } from '@/components/SeasonSwitch';
import { WardrobeShelves } from '@/components/WardrobeShelves';
import { useSeason } from '@/hooks/useSeason';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { createClient } from '@/lib/supabase/client';
import type { Item } from '@/types';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

const SEASON_FILTER_KEY = 'wearwise.wardrobe.seasonFilter';

export default function WardrobePage() {
  const isOwner = useIsOwner();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  // Honest error state — a failed read renders as an error with Retry,
  // never as a silently empty wardrobe. A failed refresh keeps existing items.
  const [loadError, setLoadError] = useState(false);
  const [seasonFilterOn, setSeasonFilterOn] = useState(false);
  const { season, source, override, toggle, setOverride, weather } = useSeason(null);
  useScrollRestoration('wardrobe', !loading);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSeasonFilterOn(window.localStorage.getItem(SEASON_FILTER_KEY) === '1');
  }, []);

  const changeSeasonFilter = useCallback((on: boolean) => {
    setSeasonFilterOn(on);
    window.localStorage.setItem(SEASON_FILTER_KEY, on ? '1' : '0');
  }, []);

  const load = useCallback(async (signal: AbortSignal) => {
    const supa = createClient();
    const { data, error } = await supa
      .from('items')
      .select('*, category:categories(*)')
      .order('created_at', { ascending: false })
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

  const active = items.filter((i) => !i.archived);

  return (
    <main className="min-h-dvh pb-4">
      <OneUIHeader
        eyebrow={isOwner ? 'WARDROBE' : "GAURAV'S WARDROBE"}
        title={isOwner ? 'Your pieces' : 'Everything he owns'}
        subtitle={loading ? '—' : loadError && items.length === 0 ? '—' : `${active.length} items`}
        right={
          isOwner ? (
            <Link href="/wardrobe/add" aria-label="Add item">
              <OneUIButton size="icon" intent="primary">
                <Plus size={20} />
              </OneUIButton>
            </Link>
          ) : undefined
        }
      />
      <div className="reach-zone">
        {loading ? (
          <div className="flex flex-col gap-6">
            {Array.from({ length: 3 }).map((_, s) => (
              <div key={s}>
                <div className="mb-2 h-5 w-28 animate-pulse rounded-full bg-white/[0.05]" />
                <div className="flex gap-2.5">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-[178px] w-[116px] animate-pulse rounded-squircle bg-white/[0.05]" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : loadError && items.length === 0 ? (
          <div role="alert" className="rounded-[1.65rem] bg-ink-100 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold leading-5 text-fog-100">Couldn&apos;t load the wardrobe</p>
                <p className="mt-1 text-[13px] leading-5 text-fog-400">Check your connection and try again.</p>
              </div>
              <button
                type="button"
                onClick={() => { setLoading(true); void load(new AbortController().signal); }}
                className="min-h-[44px] shrink-0 rounded-full bg-crimson-400/[0.14] px-5 text-[13px] font-semibold text-crimson-200 transition-colors hover:bg-crimson-400/[0.22]"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <>
            <SeasonSwitch
              season={season}
              source={source}
              override={override}
              onToggle={toggle}
              onReset={() => setOverride(null)}
              tempC={weather?.temp_c}
              className="mb-1"
            />
            <WardrobeShelves
              items={active}
              season={season}
              seasonFilterOn={seasonFilterOn}
              onSeasonFilterChange={changeSeasonFilter}
            />
          </>
        )}
      </div>
    </main>
  );
}
