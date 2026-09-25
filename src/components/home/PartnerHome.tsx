'use client';

import { GroomingCard } from '@/components/home/GroomingCard';
import { SeasonPill } from '@/components/SeasonPill';
import { cn } from '@/lib/cn';
import { useWardrobe } from '@/hooks/useWardrobe';
import { useSeason } from '@/hooks/useSeason';
import { createClient } from '@/lib/supabase/client';
import { pickGreeting } from '@/lib/greetings';
import { SEASON_META, itemSuitsSeason } from '@/lib/season';
import { cacheWeather } from '@/lib/weather-cache';
import type { Item, Outfit, WeatherSnapshot } from '@/types';
import { ChevronRight, Heart, Shirt } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

/**
 * Ishita's home.
 *
 * Different job from his: he is deciding what to wear, she is choosing for him.
 * So the primary action is not Generate, it is "Style him". Underneath sits what
 * she has already sent and a shortcut into his wardrobe.
 */
export function PartnerHome() {
  const { items } = useWardrobe();
  const [looks, setLooks] = useState<Outfit[]>([]);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const { season, source, override, toggle, setOverride } = useSeason(weather);

  useEffect(() => {
    const controller = new AbortController();
    const supa = createClient();
    (async () => {
      const { data: o } = await supa
        .from('outfits')
        .select('*')
        .eq('is_saved', true)
        .order('created_at', { ascending: false })
        .limit(40)
        .abortSignal(controller.signal);
      if (controller.signal.aborted) return;
      setLooks((o ?? []) as Outfit[]);
      setLoading(false);
    })();
    return () => controller.abort();
  }, []);

  // Weather drives the season line she sees, so her picks are sensible for his city.
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      const r = await fetch('/api/weather?', { signal: controller.signal }).catch(() => null);
      if (r?.ok) {
        const snapshot = (await r.json()) as WeatherSnapshot;
        setWeather(snapshot);
        cacheWeather(snapshot);
      }
    })();
    return () => controller.abort();
  }, []);

  const hers = useMemo(() => looks.filter((o) => o.created_by === 'partner'), [looks]);
  const wornCount = useMemo(() => hers.filter((o) => o.worn_at).length, [hers]);

  const [greeting, setGreeting] = useState('');
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGreeting(pickGreeting({ role: 'partner', date: new Date(), season, tempC: weather?.temp_c }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const seasonItems = useMemo(() => items.filter((it) => itemSuitsSeason(it, season)), [items, season]);

  /**
   * A spread across his shelves, not the first eight rows.
   *
   * Taking the head of the list showed her four pairs of shorts in a row, which
   * tells her nothing about what he owns. One piece per layer first, then fill.
   */
  const preview = useMemo(() => {
    const withImages = seasonItems.filter((i) => i.image_url);
    const seen = new Set<string>();
    const spread: Item[] = [];
    for (const it of withImages) {
      const layer = it.category?.layer_type ?? 'other';
      if (seen.has(layer)) continue;
      seen.add(layer);
      spread.push(it);
      if (spread.length === 8) return spread;
    }
    for (const it of withImages) {
      if (spread.length === 8) break;
      if (!spread.includes(it)) spread.push(it);
    }
    return spread;
  }, [seasonItems]);

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });

  return (
    <main className="min-h-dvh">
      <div className="px-5 pt-14 pb-4">
        <p suppressHydrationWarning className="mb-1.5 truncate text-[13px] font-medium text-fog-400">
          {today}
        </p>
        <h1 suppressHydrationWarning className="text-[30px] font-semibold leading-[1.15] tracking-tight text-fog-100 text-balance">
          {greeting || 'Hi Ishita'}
        </h1>

        <SeasonPill
          season={season}
          source={source}
          override={override}
          onSelect={toggle}
          onReset={() => setOverride(null)}
          lead={weather?.city ?? null}
          trail={loading ? null : `${seasonItems.length} pieces`}
          tempC={weather?.temp_c}
          className="mt-4"
        />
      </div>

      <div className="reach-zone">
        {/* Primary action. Hers is styling, not generating. */}
        <Link
          href="/style"
          className="press app-card flex items-center gap-4 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
        >
          {/* Heart, matching her nav's Style him tab, so the button and the
              destination look like the same thing. */}
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-crimson-400 text-white">
            <Heart size={21} className="fill-current" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[17px] font-semibold leading-6 text-fog-100">Style him</span>
            <span className="block text-[13px] leading-5 text-fog-400">
              Build a look and send it over
            </span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-fog-400" aria-hidden />
        </Link>

        <GroomingCard />

        {/* A glance at his wardrobe */}
        {preview.length > 0 && (
          <section aria-label="A look at his wardrobe">
            <div className="shelf-head">
              <h2 className="section-title">
                His {SEASON_META[season].label.toLowerCase()} pieces
              </h2>
              <Link
                href="/wardrobe"
                className="inline-flex min-h-[36px] items-center gap-1 rounded-full px-2 text-[12px] font-semibold text-fog-300 transition-colors hover:text-fog-100"
              >
                See all
                <ChevronRight size={13} aria-hidden />
              </Link>
            </div>
            <div className="shelf-rail">
              {preview.map((it) => (
                <Link
                  key={it.id}
                  href={`/wardrobe/${it.id}`}
                  className="press w-[96px] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400 rounded-squircle"
                >
                  <div className="photo-well aspect-[3/4] overflow-hidden rounded-squircle">
                    <Image
                      src={it.image_url!}
                      alt={it.name}
                      width={96}
                      height={128}
                      sizes="96px"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <p className="mt-1.5 truncate px-0.5 text-[11px] font-medium text-fog-300">{it.name}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* What she has sent */}
        <section aria-label="Looks you sent him">
          <div className="shelf-head">
            <h2 className="section-title flex items-center gap-2">
              <Heart size={13} className="fill-current text-crimson-300" aria-hidden />
              Your picks
            </h2>
            {hers.length > 0 && (
              <Link
                href="/looks"
                className="inline-flex min-h-[36px] items-center gap-1 rounded-full px-2 text-[12px] font-semibold text-fog-300 transition-colors hover:text-fog-100"
              >
                All
                <ChevronRight size={13} aria-hidden />
              </Link>
            )}
          </div>

          {loading ? (
            <div className="h-24 animate-pulse rounded-squircle bg-white/[0.05]" />
          ) : hers.length === 0 ? (
            <div className="rounded-squircle border border-white/[0.07] bg-white/[0.04] px-5 py-6 text-center">
              <p className="text-oneui-body text-fog-100">You have not picked anything yet.</p>
              <p className="mt-1 text-[13px] text-fog-400">
                Tap Style him and choose his next outfit.
              </p>
            </div>
          ) : (
            <>
              <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
                {hers.slice(0, 6).map((look) => {
                  const resolved = look.items
                    .map((id) => items.find((i) => i.id === id))
                    .filter((i): i is Item => Boolean(i))
                    .slice(0, 4);
                  return (
                    <Link
                      key={look.id}
                      href="/looks"
                      className="app-card block w-[164px] shrink-0 p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
                    >
                      <div className="grid grid-cols-2 gap-1.5">
                        {resolved.map((it) => (
                          <div key={it.id} className="photo-well aspect-square overflow-hidden rounded-[12px]">
                            {it.image_url ? (
                              <Image src={it.image_url} alt={it.name} width={72} height={72} sizes="72px" className="h-full w-full object-contain" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Shirt size={16} className="text-fog-500" aria-hidden />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="mt-2.5 truncate text-[13px] font-semibold text-fog-100">
                        {look.name ?? 'Your pick'}
                      </p>
                      <p className={cn(
                        'text-[11px] font-medium',
                        look.worn_at ? 'text-crimson-300' : 'text-fog-400'
                      )}>
                        {look.worn_at ? 'He wore it' : 'Waiting on him'}
                      </p>
                    </Link>
                  );
                })}
              </div>
              {wornCount > 0 && (
                <p className="mt-2 px-1 text-[12px] text-fog-400">
                  He has worn {wornCount} of your {hers.length} {hers.length === 1 ? 'pick' : 'picks'}.
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
