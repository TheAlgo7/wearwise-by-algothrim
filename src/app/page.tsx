'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import Link from 'next/link';

export default function HomePage() {
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [environment, setEnvironment] = useState<Environment>('outdoor');
  const [tripCity, setTripCity] = useState<string | null>(null);
  const [mode, setMode] = useState<string>(() => modeForDate());
  const [customContext, setCustomContext] = useState('');
  const [plannedFor, setPlannedFor] = useState<'now' | 'tonight' | 'tomorrow'>('now');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlMode = new URLSearchParams(window.location.search).get('mode');
    if (urlMode) {
      setMode(urlMode);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const [items, setItems] = useState<Item[]>([]);
  const [outfits, setOutfits] = useState<GeneratedOutfit[]>([]);
  const [generating, setGenerating] = useState(false);
  const [wornOutfitIdx, setWornOutfitIdx] = useState<number | null>(null);
  const [savedIdxs, setSavedIdxs] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supa = createClient();
    (async () => {
      const { data } = await supa
        .from('items')
        .select('*, category:categories(*)')
        .eq('archived', false);
      setItems((data ?? []) as Item[]);
    })();
  }, []);

  useEffect(() => {
    const fetchWeather = async (params: string) => {
      const r = await fetch(`/api/weather?${params}`);
      if (r.ok) setWeather(await r.json());
      else setWeather(null);
    };

    if (tripCity) { void fetchWeather(`city=${encodeURIComponent(tripCity)}`); return; }

    if (!navigator.geolocation) { void fetchWeather(''); return; }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        void fetchWeather(`lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
      },
      () => { void fetchWeather(''); },
      { maximumAge: 600_000, timeout: 6000 }
    );
  }, [tripCity]);

  const effectiveTempC = useMemo(
    () => (environment === 'indoor-ac' ? INDOOR_AC_TEMP_C : weather?.temp_c),
    [environment, weather?.temp_c]
  );

  const generate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    setOutfits([]);
    setWornOutfitIdx(null);
    setSavedIdxs(new Set());
    try {
      const body: Record<string, unknown> = { mode, environment, planned_for: plannedFor };
      if (mode === 'describe' && customContext.trim()) body.custom_context = customContext.trim();
      if (tripCity) body.trip_city = tripCity;
      if (!tripCity && coords) { body.lat = coords.lat; body.lon = coords.lon; }
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) setError((data.error ?? 'Generation failed') + (data.details ? ` — ${data.details}` : ''));
      else setOutfits(data.outfits as GeneratedOutfit[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setGenerating(false);
    }
  }, [mode, environment, tripCity, coords, customContext, plannedFor]);

  const markWorn = useCallback(async (idx: number) => {
    const o = outfits[idx];
    if (!o) return;
    setWornOutfitIdx(idx);
    const supa = createClient();
    const now = new Date().toISOString();
    await supa.from('outfits').insert({
      items: o.items,
      ai_reasoning: o.reasoning,
      confidence: o.confidence,
      worn_at: now,
      is_saved: savedIdxs.has(idx),
      context: { temp_c: effectiveTempC ?? weather?.temp_c, condition: weather?.condition, environment, mode, city: weather?.city },
    });
    for (const id of o.items) {
      const current = items.find((i) => i.id === id);
      await supa
        .from('items')
        .update({ times_worn: (current?.times_worn ?? 0) + 1, last_worn_at: now })
        .eq('id', id);
    }
  }, [outfits, savedIdxs, effectiveTempC, weather, environment, mode, items]);

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

      {/* ── VIEWING AREA ── */}
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p suppressHydrationWarning className="text-oneui-cap text-[#FF86A0] font-semibold tracking-widest uppercase mb-2 truncate">
              {today}{weather?.city ? ` · ${weather.city}` : ''}
            </p>
            <h1 suppressHydrationWarning className="text-[30px] font-semibold leading-[1.2] tracking-tight text-[#FFEDE8]">
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

        {/* Controls glass card */}
        <div className="glass-card p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3 px-1">
            <p className="text-oneui-cap text-[#FF86A0] font-semibold tracking-widest uppercase">
              Dress for
            </p>
            <TripModePicker tripCity={tripCity} onChange={setTripCity} />
          </div>
          <EnvironmentToggle value={environment} onChange={setEnvironment} />
          <ModeSelector value={mode} onChange={setMode} customContext={customContext} onCustomContextChange={setCustomContext} />

          {/* When? chips */}
          <div className="flex gap-2">
            {(['now', 'tonight', 'tomorrow'] as const).map((t) => {
              const labels = { now: 'Right now', tonight: 'Tonight', tomorrow: 'Tomorrow' };
              const active = plannedFor === t;
              return (
                <button
                  key={t}
                  onClick={() => setPlannedFor(t)}
                  className="press rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors"
                  style={{
                    background: active ? 'rgba(226,51,93,0.20)' : 'rgba(255,255,255,0.06)',
                    color: active ? '#FF86A0' : '#A89098',
                    border: `1px solid ${active ? 'rgba(226,51,93,0.35)' : 'rgba(255,255,255,0.08)'}`,
                  }}
                >
                  {labels[t]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Generate */}
        <GenerateButton onClick={generate} loading={generating} />

        {/* Error */}
        {error && (
          <div
            className="rounded-[1.5rem] px-4 py-3 text-oneui-body text-[#FFEDE8]"
            style={{
              background: 'rgba(226,51,93,0.15)',
              border: '1px solid rgba(226,51,93,0.35)',
            }}
          >
            {error}
          </div>
        )}

        {/* Outfit cards */}
        {outfits.length > 0 && (
          <section className="mt-1">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-oneui-cap text-[#FF86A0] font-semibold tracking-widest uppercase">
                Fresh for you
              </p>
              <p className="text-[11px] font-semibold text-[#FFD9DA]/45">
                {outfits.length} looks
              </p>
            </div>
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar -mx-4 px-4 pb-2">
              {outfits.map((o, idx) => (
                <OutfitCard
                  key={idx}
                  outfit={o}
                  items={items}
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
                <span key={idx} className="h-1.5 w-1.5 rounded-full bg-[#FFD9DA]/25" />
              ))}
            </div>
          </section>
        )}

        {/* Empty wardrobe nudge */}
        {items.length === 0 && !generating && (
          <div
            className="rounded-[2rem] px-5 py-6 text-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <p className="text-[#FFD9DA]/70 text-oneui-body">
              Your wardrobe is empty.
            </p>
            <p className="text-[#FF86A0] text-oneui-cap mt-1">
              Add a few pieces, then come back here.
            </p>
          </div>
        )}

      </div>
    </main>
  );
}
