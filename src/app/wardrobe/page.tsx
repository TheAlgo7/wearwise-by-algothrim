'use client';

import { OneUIHeader } from '@/components/oneui';
import { useIsOwner } from '@/components/RoleProvider';
import { SeasonPill } from '@/components/SeasonPill';
import { WardrobeShelves } from '@/components/WardrobeShelves';
import { useSeason } from '@/hooks/useSeason';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { useWardrobe, invalidateWardrobe } from '@/hooks/useWardrobe';
import { itemSuitsSeason } from '@/lib/season';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

const SEASON_FILTER_KEY = 'wearwise.wardrobe.seasonFilter';

export default function WardrobePage() {
  const isOwner = useIsOwner();
  // Shared across screens and across back-navigations, so the second visit
  // paints from memory instead of refetching 119 rows and re-rendering them.
  const { items, ready, error: loadError } = useWardrobe();
  const loading = !ready && items.length === 0;
  const [seasonFilterOn, setSeasonFilterOn] = useState(false);
  const { season, source, override, toggle, setOverride, weather } = useSeason(null);
  // Restores the moment there is a list to scroll within, which with the cache
  // is the first paint rather than several hundred milliseconds later.
  useScrollRestoration('wardrobe', items.length > 0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSeasonFilterOn(window.localStorage.getItem(SEASON_FILTER_KEY) === '1');
  }, []);

  const changeSeasonFilter = useCallback((on: boolean) => {
    setSeasonFilterOn(on);
    window.localStorage.setItem(SEASON_FILTER_KEY, on ? '1' : '0');
  }, []);

  const active = useMemo(() => items.filter((i) => !i.archived), [items]);
  const inSeasonCount = useMemo(
    () => active.filter((i) => itemSuitsSeason(i, season)).length,
    [active, season]
  );
  const shown = seasonFilterOn ? inSeasonCount : active.length;

  return (
    <main className="min-h-dvh pb-4">
      <OneUIHeader
        title={isOwner ? 'Wardrobe' : 'His wardrobe'}
        subtitle={
          loading
            ? 'Opening the shelves.'
            : loadError && items.length === 0
            ? undefined
            : isOwner
            ? 'Everything you own, by shelf.'
            : 'Everything he owns, by shelf.'
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
                onClick={() => { invalidateWardrobe(); window.location.reload(); }}
                className="min-h-[44px] shrink-0 rounded-full bg-crimson-400/[0.14] px-5 text-[13px] font-semibold text-crimson-200 transition-colors hover:bg-crimson-400/[0.22]"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <>
            <SeasonPill
              season={season}
              source={source}
              override={override}
              onSelect={toggle}
              onReset={() => setOverride(null)}
              trail={`${shown} ${shown === 1 ? 'piece' : 'pieces'}`}
              tempC={weather?.temp_c}
              filterOn={seasonFilterOn}
              onFilterChange={changeSeasonFilter}
              putAway={active.length - inSeasonCount}
              className="self-start"
            />
            <WardrobeShelves
              items={active}
              season={season}
              seasonFilterOn={seasonFilterOn}
            />
          </>
        )}
      </div>

      {isOwner && (
        <Link href="/wardrobe/add" aria-label="Add a piece" className="fab">
          <Plus size={24} strokeWidth={2.4} aria-hidden />
        </Link>
      )}
    </main>
  );
}
