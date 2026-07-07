'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { WeatherWidget } from '@/components/WeatherWidget';
import { EnvironmentToggle } from '@/components/EnvironmentToggle';
import { TripModePicker } from '@/components/TripModePicker';
import { ModeSelector } from '@/components/ModeSelector';
import { GenerateButton } from '@/components/GenerateButton';
import { OutfitCard } from '@/components/OutfitCard';
import { createClient } from '@/lib/supabase/client';
import { INDOOR_AC_TEMP_C } from '@/lib/constants';
import { modeForDate } from '@/lib/modes';
import type { Environment, Item, WeatherSnapshot, GeneratedOutfit } from '@/types';

export default function HomePage() {
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [environment, setEnvironment] = useState<Environment>('outdoor');
  const [tripCity, setTripCity] = useState<string | null>(null);
  const [tripCityError, setTripCityError] = useState<string | null>(null);
  const [mode, setMode] = useState<string>(() => modeForDate());
  const modeIsAuto = useRef(true);
  const [customContext, setCustomContext] = useState('');
  const [plannedFor, setPlannedFor] = useState<'now' | 'tonight' | 'tomorrow'>('now');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlMode = new URLSearchParams(window.location.search).get('mode');
    if (urlMode) {
      // One-time read of the ?mode= param on mount — inherently effect-driven.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode(urlMode);
      modeIsAuto.current = false;
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  // Reset auto-set mode when the day changes (e.g. PWA left open overnight on Sunday)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && modeIsAuto.current) {
        setMode(modeForDate());
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const [items, setItems] = useState<Item[]>([]);
  const [outfits, setOutfits] = useState<GeneratedOutfit[]>([]);
  const [generating, setGenerating] = useState(false);
  const [wornOutfitIdx, setWornOutfitIdx] = useState<number | null>(null);
  const [savedIdxs, setSavedIdxs] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  // Non-blocking generation notes from the server (heat / destination fallbacks)
  const [advisory, setAdvisory] = useState<string | null>(null);
  // Screen-reader status message for generation state changes
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const supa = createClient();
    (async () => {
      const { data } = await supa
        .from('items')
        .select('*, category:categories(*)')
        .eq('archived', false)
        .abortSignal(controller.signal);
      if (!controller.signal.aborted) setItems((data ?? []) as Item[]);
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const fetchWeather = async (params: string) => {
      const r = await fetch(`/api/weather?${params}`, { signal: controller.signal });
      if (r.ok) setWeather(await r.json());
      else setWeather(null);
    };

    if (tripCity) {
      // Clear any stale "city not found" error before refetching for the new city.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTripCityError(null);
      (async () => {
        const r = await fetch(`/api/weather?city=${encodeURIComponent(tripCity)}`, { signal: controller.signal });
        if (r.ok) {
          setWeather(await r.json());
        } else {
          setTripCityError(`"${tripCity}" not found — using your current location.`);
          if (!navigator.geolocation) { void fetchWeather(''); return; }
          navigator.geolocation.getCurrentPosition(
            (pos) => { void fetchWeather(`lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`); },
            () => { void fetchWeather(''); },
            { maximumAge: 600_000, timeout: 6000 }
          );
        }
      })();
      return () => controller.abort();
    }

    if (!navigator.geolocation) { void fetchWeather(''); return () => controller.abort(); }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        void fetchWeather(`lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
      },
      () => { void fetchWeather(''); },
      { maximumAge: 600_000, timeout: 6000 }
    );
    return () => controller.abort();
  }, [tripCity]);

  const effectiveTempC = useMemo(
    () => (environment === 'indoor-ac' ? INDOOR_AC_TEMP_C : weather?.temp_c),
    [environment, weather?.temp_c]
  );

  // Memoize byId map — only rebuild when items list changes (not on every parent re-render)
  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const generate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    setAdvisory(null);
    setOutfits([]);
    setWornOutfitIdx(null);
    setSavedIdxs(new Set());
    setStatusMsg('Generating your outfit…');
    try {
      const body: Record<string, unknown> = { mode, environment, planned_for: plannedFor };
      if (mode === 'describe' && customContext.trim()) body.custom_context = customContext.trim();
      if (tripCity && !tripCityError) body.trip_city = tripCity;
      if ((!tripCity || tripCityError) && coords) { body.lat = coords.lat; body.lon = coords.lon; }
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = (data.error ?? 'Generation failed') + (data.details ? ` — ${data.details}` : '');
        setError(msg);
        setStatusMsg(`Error: ${msg}`);
      } else {
        setOutfits(data.outfits as GeneratedOutfit[]);
        setAdvisory((data.destination_advisory ?? data.heat_advisory ?? null) as string | null);
        setStatusMsg(`${(data.outfits as GeneratedOutfit[]).length} outfit${(data.outfits as GeneratedOutfit[]).length === 1 ? '' : 's'} ready.`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setError(msg);
      setStatusMsg(`Error: ${msg}`);
    } finally {
      setGenerating(false);
    }
  }, [mode, environment, tripCity, tripCityError, coords, customContext, plannedFor]);

  const markWorn = useCallback(async (idx: number) => {
    const o = outfits[idx];
    if (!o) return;
    setWornOutfitIdx(idx);
    try {
      const res = await fetch('/api/wear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: o.items,
          reasoning: o.reasoning,
          confidence: o.confidence,
          is_saved: savedIdxs.has(idx),
          context: { temp_c: effectiveTempC ?? weather?.temp_c, condition: weather?.condition, environment, mode, city: weather?.city },
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
      setStatusMsg('Outfit logged. Wear history updated.');
    } catch (err) {
      // Don't pretend it was logged — clear the worn state and surface the failure.
      setWornOutfitIdx(null);
      const msg = err instanceof Error ? err.message : 'Network error';
      setStatusMsg(`Couldn't log outfit: ${msg}`);
    }
  }, [outfits, savedIdxs, effectiveTempC, weather, environment, mode]);

  const toggleSave = useCallback((idx: number) => {
    setSavedIdxs((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }, []);

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'short',
  });

  const greeting = (() => {
    const h = new Date().getHours();
    if (h >= 4  && h <  6) return "Can't sleep?";
    if (h >= 6  && h <  9) return 'Early start.';
    if (h >= 9  && h < 12) return 'Morning, Gaurav.';
    if (h >= 12 && h < 14) return 'Midday already.';
    if (h >= 14 && h < 17) return 'Afternoon, Gaurav.';
    if (h >= 17 && h < 20) return 'Evening plans?';
    if (h >= 20 && h < 23) return 'Night out?';
    return 'Night owl mode.';
  })();

  return (
    <main className="min-h-dvh">
      {/* Screen-reader live region — announces generation state changes */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {statusMsg}
      </div>

      {/* ── VIEWING AREA ── */}
      {/* Nav clearance lives on .reach-zone below — header needs only its own rhythm */}
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p suppressHydrationWarning className="text-oneui-cap text-crimson-300 font-semibold tracking-widest uppercase mb-2 truncate">
              {today}{weather?.city ? ` · ${weather.city}` : ''}
            </p>
            <h1 suppressHydrationWarning className="text-[30px] font-semibold leading-[1.2] tracking-tight text-crimson-50">
              {greeting}
            </h1>
          </div>
          <WeatherWidget
            weather={weather}
            effectiveTempC={environment === 'indoor-ac' ? INDOOR_AC_TEMP_C : undefined}
            tripCity={tripCity}
            variant="compact"
            className="shrink-0 w-[126px]"
          />
        </div>
      </div>

      {/* ── INTERACTION AREA ── */}
      <div className="reach-zone">

        {/* Controls card */}
        <div className="glass-card p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3 px-1">
            <p className="text-oneui-cap text-crimson-300 font-semibold tracking-widest uppercase">
              Dress for
            </p>
            <TripModePicker tripCity={tripCity} onChange={(v) => { setTripCity(v); setTripCityError(null); }} />
          </div>
          {tripCityError && (
            <p className="text-[12px] text-fog-400 px-1 -mt-2">{tripCityError}</p>
          )}
          <EnvironmentToggle value={environment} onChange={setEnvironment} />
          <ModeSelector
            value={mode}
            onChange={(v) => { modeIsAuto.current = false; setMode(v); }}
            customContext={customContext}
            onCustomContextChange={setCustomContext}
          />

          {/* When? chips */}
          <div className="flex gap-2" role="group" aria-label="When">
            {(['now', 'tonight', 'tomorrow'] as const).map((t) => {
              const labels = { now: 'Right now', tonight: 'Tonight', tomorrow: 'Tomorrow' };
              const active = plannedFor === t;
              return (
                <button
                  key={t}
                  onClick={() => setPlannedFor(t)}
                  aria-pressed={active}
                  className={cn(
                    'press rounded-full px-4 py-3 text-[12px] font-semibold transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400',
                    active
                      ? 'bg-crimson-400/20 text-crimson-300 border-crimson-400/35'
                      : 'bg-white/[0.06] text-fog-300 border-white/[0.08]'
                  )}
                >
                  {labels[t]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Generate */}
        <GenerateButton onClick={generate} loading={generating} />

        {/* Error — distinct muted-red, never the CTA crimson */}
        {error && (
          <div
            role="alert"
            className="rounded-[1.5rem] px-4 py-3 text-oneui-body text-error-text bg-error/40 border border-error-border"
          >
            {error}
          </div>
        )}

        {/* Advisory — informational, not an error (heat fallback / destination fallback) */}
        {advisory && !error && (
          <p role="status" className="text-[12px] text-fog-400 px-1 -mt-2">
            {advisory}
          </p>
        )}

        {/* Outfit cards */}
        {outfits.length > 0 && (
          <section className="mt-1" aria-label={`Generated outfits — ${outfits.length} look${outfits.length !== 1 ? 's' : ''}`}>
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-oneui-cap text-crimson-300 font-semibold tracking-widest uppercase">
                Fresh for you
              </p>
              <p className="text-[11px] font-semibold text-crimson-100/45">
                {outfits.length} looks
              </p>
            </div>
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar -mx-4 px-4 pb-2">
              {outfits.map((o, idx) => (
                <OutfitCard
                  key={idx}
                  outfit={o}
                  items={items}
                  itemById={itemById}
                  saved={savedIdxs.has(idx)}
                  worn={wornOutfitIdx === idx}
                  onSave={() => toggleSave(idx)}
                  onWear={() => markWorn(idx)}
                  className="w-[calc(100vw-2rem)] max-w-[544px] shrink-0 snap-center"
                />
              ))}
            </div>
            <div className="mt-1 flex justify-center gap-1.5" aria-hidden>
              {outfits.map((_, idx) => (
                <span key={idx} className="h-1.5 w-1.5 rounded-full bg-crimson-100/25" />
              ))}
            </div>
          </section>
        )}

        {/* Empty wardrobe nudge */}
        {items.length === 0 && !generating && (
          <div className="rounded-[2rem] px-5 py-6 text-center bg-white/[0.04] border border-white/[0.07]">
            <p className="text-crimson-100/70 text-oneui-body">
              Your wardrobe is empty.
            </p>
            <p className="text-crimson-300 text-oneui-cap mt-1">
              Add a few pieces, then come back here.
            </p>
          </div>
        )}

      </div>
    </main>
  );
}
