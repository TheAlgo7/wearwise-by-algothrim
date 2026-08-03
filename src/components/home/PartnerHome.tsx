'use client';

import { SeasonSwitch } from '@/components/SeasonSwitch';
import { useSeason } from '@/hooks/useSeason';
import { createClient } from '@/lib/supabase/client';
import { pickGreeting } from '@/lib/greetings';
import { SEASON_META, itemSuitsSeason } from '@/lib/season';
import { cacheWeather } from '@/lib/weather-cache';
import type { Item, Outfit, WeatherSnapshot } from '@/types';
import { ChevronRight, Heart, Shirt, Sparkles } from 'lucide-react';
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
  const [items, setItems] = useState<Item[]>([]);
  const [looks, setLooks] = useState<Outfit[]>([]);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const { season, source, override, toggle, setOverride } = useSeason(weather);

  useEffect(() => {
    const controller = new AbortController();
    const supa = createClient();
    (async () => {
      const [{ data: i }, { data: o }] = await Promise.all([
        supa.from('items').select('*, category:categories(*)').eq('archived', false).abortSignal(controller.signal),
        supa.from('outfits').select('*').eq('is_saved', true).order('created_at', { ascending: false }).limit(40).abortSignal(controller.signal),
      ]);
      if (controller.signal.aborted) return;
      setItems((i ?? []) as Item[]);
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
  const preview = useMemo(() => seasonItems.filter((i) => i.image_url).slice(0, 8), [seasonItems]);

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });

  return (
    <main className="min-h-dvh">
      <div className="px-5 pt-14 pb-4">
        <p suppressHydrationWarning className="mb-2 truncate text-oneui-cap font-semibold uppercase tracking-widest text-crimson-300">
          {today}{weather?.city ? ` · ${weather.city}` : ''}
        </p>
        <h1 suppressHydrationWarning className="text-[30px] font-semibold leading-[1.2] tracking-tight text-crimson-50 text-balance">
          {greeting || 'Hi Ishita'}
        </h1>
        <p className="mt-2 text-oneui-body text-crimson-100/70 text-pretty">
          {loading
            ? 'Opening his wardrobe.'
            : `${items.length} pieces are his. Pick what he wears.`}
        </p>
      </div>

      <div className="reach-zone">
        {/* Primary action. Hers is styling, not generating. */}
        <Link
          href="/style"
          className="press glass-card flex items-center gap-4 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-crimson-400/15 text-crimson-300">
            <Sparkles size={22} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[17px] font-semibold leading-6 text-crimson-50">Style him</span>
            <span className="block text-[13px] leading-5 text-fog-400">
              Build a look from his wardrobe and send it over
            </span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-crimson-300" aria-hidden />
        </Link>

        <SeasonSwitch
          season={season}
          source={source}
          override={override}
          onToggle={toggle}
          onReset={() => setOverride(null)}
          tempC={weather?.temp_c}
          className="mt-1"
        />

        {/* A glance at his wardrobe */}
        {preview.length > 0 && (
          <section aria-label="A look at his wardrobe">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-oneui-cap font-semibold uppercase tracking-widest text-crimson-300">
                His {SEASON_META[season].label.toLowerCase()} pieces
              </p>
              <Link
                href="/wardrobe"
                className="inline-flex min-h-8 items-center gap-1 rounded-full px-2 text-[11px] font-semibold text-crimson-100/60 transition-colors hover:text-crimson-200"
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
                  <div className="aspect-[3/4] overflow-hidden rounded-squircle border border-white/[0.07] bg-ink-0">
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
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="flex items-center gap-2 text-oneui-cap font-semibold uppercase tracking-widest text-crimson-300">
              <Heart size={12} className="fill-current" aria-hidden />
              Your picks
            </p>
            {hers.length > 0 && (
              <Link
                href="/looks"
                className="inline-flex min-h-8 items-center gap-1 rounded-full px-2 text-[11px] font-semibold text-crimson-100/60 transition-colors hover:text-crimson-200"
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
              <p className="text-oneui-body text-crimson-100/75">You have not picked anything yet.</p>
              <p className="mt-1 text-oneui-cap text-crimson-300">
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
                      className="glass-card block w-[172px] shrink-0 p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
                    >
                      <div className="grid grid-cols-2 gap-1.5">
                        {resolved.map((it) => (
                          <div key={it.id} className="aspect-square overflow-hidden rounded-[12px] border border-white/[0.07] bg-ink-0">
                            {it.image_url ? (
                              <Image src={it.image_url} alt={it.name} width={76} height={76} sizes="76px" className="h-full w-full object-contain" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Shirt size={16} className="text-crimson-100/25" aria-hidden />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="mt-2.5 truncate text-[13px] font-semibold text-crimson-50">
                        {look.name ?? 'Your pick'}
                      </p>
                      <p className="text-[11px] font-medium text-fog-400">
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
