'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { PickInbox } from '@/components/PickInbox';
import { SaveLookSheet } from '@/components/SaveLookSheet';
import { CareCard } from '@/components/home/CareCard';
import { useCare } from '@/hooks/useCare';
import { TodayContextSheet } from '@/components/home/TodayContextSheet';
import { TodayFit, TodayFitSkeleton } from '@/components/home/TodayFit';
import { useSeason } from '@/hooks/useSeason';
import { createClient } from '@/lib/supabase/client';
import { INDOOR_AC_TEMP_C } from '@/lib/constants';
import { modeForDate } from '@/lib/modes';
import { pickGreeting } from '@/lib/greetings';
import { SEASON_META, type Season } from '@/lib/season';
import {
  contextSignature,
  contextSummary,
  readTodayFit,
  writeTodayContext,
  writeTodayFit,
  type TodayContext,
} from '@/lib/today-context';
import { cacheWeather } from '@/lib/weather-cache';
import type { Item, Outfit, WeatherSnapshot, GeneratedOutfit } from '@/types';
import { ChevronRight, Shirt, SlidersHorizontal, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

/**
 * Gaurav's home.
 *
 * It used to open on six controls and a Generate button: trip, season,
 * environment, occasion, timing, and only then an answer. That is a
 * configuration screen, and he opens this app at 7am with one question.
 *
 * Now it opens on the answer. Everything the engine assumed is compressed into
 * one line under the greeting, and the controls that produced those assumptions
 * live in a sheet behind it. The alternatives still exist behind "Another
 * option" — they are just not something he has to shop for before he can leave.
 */
export function OwnerHome() {
  // ── Context: one object, one line, one sheet ──
  const [context, setContext] = useState<TodayContext>(() => ({
    mode: modeForDate(),
    environment: 'outdoor',
    plannedFor: 'now',
    tripCity: null,
  }));
  const modeIsAuto = useRef(true);
  const [customContext, setCustomContext] = useState('');
  const [contextOpen, setContextOpen] = useState(false);

  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [tripCityError, setTripCityError] = useState<string | null>(null);
  /** Which place the current snapshot describes, or null while in flight. */
  const [weatherFor, setWeatherFor] = useState<string | null>(null);

  const { season, source, override, setOverride, hydrated } = useSeason(weather);

  const [items, setItems] = useState<Item[]>([]);
  const [itemsReady, setItemsReady] = useState(false);
  const [savedLooks, setSavedLooks] = useState<Outfit[]>([]);

  const [outfits, setOutfits] = useState<GeneratedOutfit[]>([]);
  const [optionIdx, setOptionIdx] = useState(0);
  const [generating, setGenerating] = useState(false);
  /**
   * The fit on screen answers an older question and is being replaced.
   *
   * The app generates on open, so without this there is a blank skeleton
   * between opening it and the model answering. Yesterday's outfit is a far
   * better thing to look at for six seconds than a grey rectangle, and it is
   * honest as long as it says so.
   */
  const [stale, setStale] = useState(false);
  const genAbort = useRef<AbortController | null>(null);
  const [wornIdxs, setWornIdxs] = useState<Set<number>>(new Set());
  const [savedIdxs, setSavedIdxs] = useState<Set<number>>(new Set());
  const [saveTarget, setSaveTarget] = useState<GeneratedOutfit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [advisory, setAdvisory] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState('');

  const signature = useMemo(() => contextSignature(context, season), [context, season]);

  // Care reads the same assumptions rather than asking him again in its own sheet.
  useEffect(() => {
    writeTodayContext(context);
  }, [context]);

  // ── One-time read of ?mode= (PWA shortcuts and old deep links) ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlMode = new URLSearchParams(window.location.search).get('mode');
    if (!urlMode) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContext((c) => ({ ...c, mode: urlMode }));
    modeIsAuto.current = false;
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  // Left open overnight on a Saturday, it should not still be dressing him for Saturday.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && modeIsAuto.current) {
        setContext((c) => (c.mode === modeForDate() ? c : { ...c, mode: modeForDate() }));
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // ── Wardrobe ──
  useEffect(() => {
    const controller = new AbortController();
    const supa = createClient();
    (async () => {
      const { data } = await supa
        .from('items')
        .select('*, category:categories(*)')
        .eq('archived', false)
        .abortSignal(controller.signal);
      if (controller.signal.aborted) return;
      setItems((data ?? []) as Item[]);
      setItemsReady(true);
    })();
    return () => controller.abort();
  }, []);

  const loadLooks = useCallback(async (signal?: AbortSignal) => {
    const supa = createClient();
    let q = supa
      .from('outfits')
      .select('*')
      .eq('is_saved', true)
      .order('created_at', { ascending: false })
      .limit(40);
    if (signal) q = q.abortSignal(signal);
    const { data } = await q;
    if (signal?.aborted) return;
    setSavedLooks((data ?? []) as Outfit[]);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadLooks(controller.signal);
    return () => controller.abort();
  }, [loadLooks]);

  // ── Weather ──
  const tripCity = context.tripCity;
  useEffect(() => {
    const controller = new AbortController();
    const settleAs = tripCity ?? 'here';

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWeatherFor(null);

    const fetchWeather = async (params: string) => {
      try {
        const r = await fetch(`/api/weather?${params}`, { signal: controller.signal });
        if (r.ok) {
          const snapshot = (await r.json()) as WeatherSnapshot;
          setWeather(snapshot);
          cacheWeather(snapshot);
        } else {
          setWeather(null);
        }
      } catch {
        if (controller.signal.aborted) return;
        setWeather(null);
      }
      if (!controller.signal.aborted) setWeatherFor(settleAs);
    };

    if (tripCity) {
      setTripCityError(null);
      (async () => {
        const r = await fetch(`/api/weather?city=${encodeURIComponent(tripCity)}`, {
          signal: controller.signal,
        }).catch(() => null);
        if (controller.signal.aborted) return;
        if (r?.ok) {
          const snapshot = (await r.json()) as WeatherSnapshot;
          setWeather(snapshot);
          cacheWeather(snapshot);
          setWeatherFor(settleAs);
          return;
        }
        setTripCityError(`Could not find "${tripCity}". Using where you are.`);
        if (!navigator.geolocation) { void fetchWeather(''); return; }
        navigator.geolocation.getCurrentPosition(
          (pos) => void fetchWeather(`lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`),
          () => void fetchWeather(''),
          { maximumAge: 600_000, timeout: 6000 }
        );
      })();
      return () => controller.abort();
    }

    if (!navigator.geolocation) { void fetchWeather(''); return () => controller.abort(); }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        void fetchWeather(`lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
      },
      () => void fetchWeather(''),
      { maximumAge: 600_000, timeout: 6000 }
    );
    return () => controller.abort();
  }, [tripCity]);

  const effectiveTempC = useMemo(
    () => (context.environment === 'indoor-ac' ? INDOOR_AC_TEMP_C : weather?.temp_c),
    [context.environment, weather?.temp_c]
  );

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const picks = useMemo(() => savedLooks.filter((o) => o.created_by === 'partner'), [savedLooks]);
  const unseenPicks = useMemo(() => picks.filter((p) => !p.seen_at).length, [picks]);

  const seasonLooks = useMemo(
    () =>
      savedLooks
        .filter((o) => o.created_by !== 'partner' && (o.season === season || o.season === null))
        .slice(0, 6),
    [savedLooks, season]
  );

  const [greeting, setGreeting] = useState('');
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGreeting(
      pickGreeting({
        role: 'owner',
        date: new Date(),
        season,
        tempC: weather?.temp_c,
        condition: weather?.condition,
        unseenPicks,
        itemCount: items.length,
      })
    );
    // Deliberately excludes season/weather churn: re-rolling the greeting as
    // weather refreshes mid-session would make it feel unstable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unseenPicks, items.length === 0]);

  // ── Generation ──
  const generate = useCallback(async () => {
    genAbort.current?.abort();
    const controller = new AbortController();
    genAbort.current = controller;

    setGenerating(true);
    setError(null);
    setAdvisory(null);
    setStatusMsg('Putting today’s fit together.');
    try {
      const body: Record<string, unknown> = {
        mode: context.mode,
        environment: context.environment,
        planned_for: context.plannedFor,
        season,
      };
      if (context.mode === 'describe' && customContext.trim()) body.custom_context = customContext.trim();
      if (context.tripCity && !tripCityError) body.trip_city = context.tripCity;
      if ((!context.tripCity || tripCityError) && coords) { body.lat = coords.lat; body.lon = coords.lon; }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = (data.error ?? 'Generation failed') + (data.details ? `. ${data.details}` : '');
        setError(msg);
        setStatusMsg(`Error: ${msg}`);
        return;
      }

      const next = data.outfits as GeneratedOutfit[];
      const nextAdvisory = (data.destination_advisory ?? data.heat_advisory ?? null) as string | null;
      setOutfits(next);
      setStale(false);
      setOptionIdx(0);
      setWornIdxs(new Set());
      setSavedIdxs(new Set());
      setAdvisory(nextAdvisory);
      setStatusMsg(
        next.length > 1
          ? `Today's fit is ready, with ${next.length - 1} other option${next.length === 2 ? '' : 's'}.`
          : "Today's fit is ready."
      );
      writeTodayFit({
        signature: contextSignature(context, season),
        outfits: next,
        advisory: nextAdvisory,
        index: 0,
        worn: [],
        saved: [],
      });
    } catch (err) {
      // An abort is him choosing to keep what is on screen, not a failure.
      if (controller.signal.aborted) return;
      const msg = err instanceof Error ? err.message : 'Network error';
      setError(msg);
      setStatusMsg(`Error: ${msg}`);
    } finally {
      if (!controller.signal.aborted) setGenerating(false);
    }
  }, [context, customContext, tripCityError, coords, season]);

  /**
   * Stop waiting: the fit already on screen becomes today's answer.
   *
   * Cached under the current signature too, so opening the app again in five
   * minutes does not restart the same slow call he just dismissed.
   */
  const keepPrevious = useCallback(() => {
    genAbort.current?.abort();
    setGenerating(false);
    setStale(false);
    setStatusMsg('Keeping the previous fit.');
    if (outfits.length > 0) {
      writeTodayFit({
        signature,
        outfits,
        advisory: null,
        index: optionIdx,
        worn: [...wornIdxs],
        saved: [...savedIdxs],
      });
    }
  }, [outfits, signature, optionIdx, wornIdxs, savedIdxs]);

  /**
   * The fit is on screen before he asks for it.
   *
   * Only once everything the answer depends on has actually settled — wardrobe
   * loaded, season override read, and a weather snapshot for the right place —
   * so a slow geolocation callback cannot cause two model calls in a row.
   */
  const ready = itemsReady && hydrated && weatherFor === (context.tripCity ?? 'here');
  const ranFor = useRef<string | null>(null);

  useEffect(() => {
    if (!ready || items.length === 0) return;
    if (ranFor.current === signature) return;
    ranFor.current = signature;

    const cached = readTodayFit();
    if (cached && cached.outfits.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOutfits(cached.outfits);
      setOptionIdx(Math.min(cached.index, cached.outfits.length - 1));

      if (cached.signature === signature) {
        setAdvisory(cached.advisory);
        setWornIdxs(new Set(cached.worn));
        setSavedIdxs(new Set(cached.saved));
        setStale(false);
        return;
      }

      // Right answer to yesterday's question. Show it while the real one loads
      // rather than opening onto an empty hero.
      setAdvisory(null);
      setWornIdxs(new Set());
      setSavedIdxs(new Set());
      setStale(true);
    }
    void generate();
    // `generate` is intentionally out of the dependency list: it changes identity
    // whenever coords arrive, and the signature guard above is what decides
    // whether this question has already been answered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, signature, items.length]);

  /** Persist whatever changed about the current batch without refetching it. */
  const patchCache = useCallback(
    (patch: Partial<{ index: number; worn: number[]; saved: number[] }>) => {
      const current = readTodayFit();
      if (!current || current.signature !== signature) return;
      writeTodayFit({ ...current, ...patch });
    },
    [signature]
  );

  const another = useCallback(() => {
    if (optionIdx + 1 < outfits.length) {
      const next = optionIdx + 1;
      setOptionIdx(next);
      patchCache({ index: next });
      setStatusMsg(`Option ${next + 1} of ${outfits.length}.`);
      return;
    }
    // Out of alternatives in this batch, so go and get a fresh one.
    void generate();
  }, [optionIdx, outfits.length, patchCache, generate]);

  const wearOutfit = useCallback(
    async (payload: { items: string[]; reasoning?: string; confidence?: number; is_saved?: boolean }) => {
      const res = await fetch('/api/wear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          context: {
            temp_c: effectiveTempC ?? weather?.temp_c,
            condition: weather?.condition,
            environment: context.environment,
            mode: context.mode,
            season,
            city: weather?.city,
          },
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
    },
    [effectiveTempC, weather, context.environment, context.mode, season]
  );

  const markWorn = useCallback(async () => {
    const o = outfits[optionIdx];
    if (!o) return;
    const next = new Set(wornIdxs).add(optionIdx);
    setWornIdxs(next);
    try {
      await wearOutfit({
        items: o.items,
        reasoning: o.reasoning,
        confidence: o.confidence,
        is_saved: savedIdxs.has(optionIdx),
      });
      patchCache({ worn: [...next] });
      setStatusMsg('Outfit logged. Wear history updated.');
    } catch (err) {
      // Don't pretend it was logged.
      const rolled = new Set(wornIdxs);
      rolled.delete(optionIdx);
      setWornIdxs(rolled);
      setStatusMsg(`Couldn't log outfit: ${err instanceof Error ? err.message : 'Network error'}`);
    }
  }, [outfits, optionIdx, wornIdxs, savedIdxs, wearOutfit, patchCache]);

  const wearPick = useCallback(
    async (look: Outfit) => {
      try {
        await wearOutfit({
          items: look.items,
          reasoning: look.name ? `Wore Ishita's pick: "${look.name}".` : "Wore Ishita's pick.",
          confidence: look.confidence ?? undefined,
        });
        setStatusMsg('Logged. She will be pleased.');
      } catch (err) {
        setStatusMsg(`Couldn't log that: ${err instanceof Error ? err.message : 'Network error'}`);
      }
    },
    [wearOutfit]
  );

  const markPickSeen = useCallback((id: string) => {
    setSavedLooks((prev) => prev.map((o) => (o.id === id ? { ...o, seen_at: new Date().toISOString() } : o)));
    void fetch('/api/looks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, seen: true }),
    }).catch(() => { /* cosmetic only; the dot will return next load */ });
  }, []);

  const applyContext = useCallback(
    (next: { context: TodayContext; customContext: string; seasonOverride: Season | null }) => {
      modeIsAuto.current = false;
      setContext(next.context);
      setCustomContext(next.customContext);
      setOverride(next.seasonOverride);
      if (next.context.tripCity !== context.tripCity) setTripCityError(null);
    },
    [setOverride, context.tripCity]
  );

  // Care runs off the same context the outfit does. Only asked for once the
  // weather has settled, so the plan is not built against a missing humidity.
  const care = useCare(
    {
      mode: context.mode,
      environment: context.environment,
      plannedFor: context.plannedFor,
      tempC: weather?.temp_c ?? null,
      humidity: weather?.humidity ?? null,
      condition: weather?.condition ?? null,
    },
    weatherFor !== null
  );

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const summary = contextSummary(context, {
    city: weather?.city,
    tempC: context.environment === 'indoor-ac' ? INDOOR_AC_TEMP_C : weather?.temp_c,
  });

  const current = outfits[optionIdx];

  return (
    <main className="min-h-dvh">
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {statusMsg}
      </div>

      {/* ── Header ── */}
      <div className="px-5 pt-11 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p suppressHydrationWarning className="mb-1.5 truncate text-[13px] font-medium text-fog-400">
              {today}
            </p>
            <h1
              suppressHydrationWarning
              className="text-[30px] font-semibold leading-[1.15] tracking-tight text-fog-100 text-balance"
            >
              {greeting || 'Hello.'}
            </h1>
          </div>
          <Link
            href="/profile"
            aria-label="Your style profile"
            className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.05] text-fog-300 transition-colors hover:text-fog-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
          >
            <User size={19} aria-hidden />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setContextOpen(true)}
          aria-haspopup="dialog"
          className="context-pill mt-4"
        >
          <span className="truncate">{summary}</span>
          <SlidersHorizontal size={15} className="shrink-0 text-fog-400" aria-hidden />
        </button>
        {tripCityError && (
          <p className="mt-2 px-1 text-[12px] text-fog-400">{tripCityError}</p>
        )}
      </div>

      {/* ── Content ── */}
      <div className="reach-zone">
        <CareCard plan={care.state?.plan ?? null} loading={care.loading} />

        {error && (
          <div
            role="alert"
            className="rounded-[1.5rem] border border-error-border bg-error/40 px-4 py-3 text-oneui-body text-error-text"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void generate()}
              className="press mt-2 min-h-[44px] rounded-full bg-white/[0.1] px-5 text-[13px] font-semibold text-error-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
            >
              Try again
            </button>
          </div>
        )}

        {items.length === 0 && itemsReady ? (
          <div className="rounded-squircle-lg border border-white/[0.07] bg-white/[0.04] px-5 py-7 text-center">
            <p className="text-oneui-body text-fog-100">Your wardrobe is empty.</p>
            <p className="mt-1 text-[13px] text-fog-400">Add a few pieces, then come back here.</p>
            <Link
              href="/wardrobe/add"
              className="press mt-4 inline-flex min-h-[48px] items-center rounded-full bg-crimson-400 px-6 text-[15px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
            >
              Add your first piece
            </Link>
          </div>
        ) : current ? (
          <TodayFit
            outfit={current}
            items={items}
            itemById={itemById}
            index={optionIdx}
            total={outfits.length}
            worn={wornIdxs.has(optionIdx)}
            saved={savedIdxs.has(optionIdx)}
            busy={generating}
            stale={stale}
            onWear={() => void markWorn()}
            onAnother={another}
            onSave={() => setSaveTarget(current)}
            onKeepPrevious={keepPrevious}
          />
        ) : !error ? (
          <TodayFitSkeleton />
        ) : null}

        {advisory && !error && (
          <p role="status" className="px-1 text-[12px] leading-5 text-fog-400">
            {advisory}
          </p>
        )}

        <PickInbox picks={picks} itemById={itemById} onWear={wearPick} onSeen={markPickSeen} />

        {seasonLooks.length > 0 && (
          <section aria-label={`Saved looks for ${SEASON_META[season].label}`} className="mt-1">
            <div className="shelf-head">
              <h2 className="section-title">Ready to wear</h2>
              <Link
                href="/looks"
                className="inline-flex min-h-[36px] items-center gap-1 rounded-full px-2 text-[12px] font-semibold text-fog-300 transition-colors hover:text-fog-100"
              >
                All
                <ChevronRight size={13} aria-hidden />
              </Link>
            </div>
            <div className="shelf-rail">
              {seasonLooks.map((look) => {
                const resolved = look.items
                  .map((id) => itemById.get(id))
                  .filter((i): i is Item => Boolean(i))
                  .slice(0, 4);
                return (
                  <Link
                    key={look.id}
                    href="/looks"
                    className={cn(
                      'app-card block w-[164px] shrink-0 p-3',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400'
                    )}
                  >
                    <div className="grid grid-cols-2 gap-1.5">
                      {resolved.map((it) => (
                        <div key={it.id} className="aspect-square overflow-hidden rounded-[12px] bg-ink-0">
                          {it.image_url ? (
                            <Image
                              src={it.image_url}
                              alt={it.name}
                              width={72}
                              height={72}
                              sizes="72px"
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Shirt size={16} className="text-fog-500" aria-hidden />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="mt-2.5 truncate text-[13px] font-semibold text-fog-100">
                      {look.name ?? 'Saved look'}
                    </p>
                    <p className="text-[11px] font-medium text-fog-400">
                      {look.season ? SEASON_META[look.season].label : 'Any season'}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <TodayContextSheet
        open={contextOpen}
        onClose={() => setContextOpen(false)}
        context={context}
        customContext={customContext}
        season={season}
        seasonSource={source}
        seasonOverride={override}
        onApply={applyContext}
      />

      <SaveLookSheet
        open={saveTarget !== null}
        onClose={() => setSaveTarget(null)}
        onSaved={() => {
          const next = new Set(savedIdxs).add(optionIdx);
          setSavedIdxs(next);
          patchCache({ saved: [...next] });
          setStatusMsg('Look saved.');
          void loadLooks();
        }}
        items={saveTarget?.items ?? []}
        defaultSeason={season}
        reasoning={saveTarget?.reasoning}
        confidence={saveTarget?.confidence}
        context={{
          mode: context.mode,
          environment: context.environment,
          season,
          city: weather?.city,
          temp_c: effectiveTempC,
        }}
      />
    </main>
  );
}
