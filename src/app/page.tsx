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
      const body: Record<string, unknown> = { mode, environment };
      if (tripCity) body.trip_city = tripCity;
      if (!tripCity && coords) { body.lat = coords.lat; body.lon = coords.lon; }
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? 'Generation failed');
      else setOutfits(data.outfits as GeneratedOutfit[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setGenerating(false);
    }
  }, [mode, environment, tripCity, coords]);

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

  return (
    <main className="min-h-dvh">

      {/* ── VIEWING AREA ── */}
      <div className="px-5 pt-16 pb-6">
        <p className="text-oneui-cap text-[#FF86A0] font-semibold tracking-widest uppercase mb-3">
          {today}{weather?.city ? ` · ${weather.city}` : ''}
        </p>
        <h1 className="text-[30px] font-semibold leading-[1.2] tracking-tight text-[#FFEDE8]">
          What do you wear today?
        </h1>
        {mode && (
          <p className="mt-2 text-oneui-body text-[#FFD9DA]/70 capitalize">
            Mode: {mode}
          </p>
        )}
      </div>

      {/* ── INTERACTION AREA ── */}
      <div className="reach-zone">

        {/* Weather glass card */}
        <WeatherWidget
          weather={weather}
          effectiveTempC={environment === 'indoor-ac' ? INDOOR_AC_TEMP_C : undefined}
          tripCity={tripCity}
        />

        {/* Controls glass card */}
        <div className="glass-card p-5 flex flex-col gap-4">
          <EnvironmentToggle value={environment} onChange={setEnvironment} />
          <div className="flex">
            <TripModePicker tripCity={tripCity} onChange={setTripCity} />
          </div>
          <ModeSelector value={mode} onChange={setMode} />
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
          <div className="flex flex-col gap-3 mt-1">
            <p className="text-oneui-cap text-[#FF86A0] font-semibold tracking-widest uppercase px-1">
              Fresh for you
            </p>
            {outfits.map((o, idx) => (
              <OutfitCard
                key={idx}
                outfit={o}
                items={items}
                saved={savedIdxs.has(idx)}
                worn={wornOutfitIdx === idx}
                onSave={() => toggleSave(idx)}
                onWear={() => markWorn(idx)}
              />
            ))}
          </div>
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
