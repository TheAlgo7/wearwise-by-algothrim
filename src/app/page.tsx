'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { OneUIHeader } from '@/components/oneui';
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
import { Plus } from 'lucide-react';

export default function HomePage() {
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [environment, setEnvironment] = useState<Environment>('outdoor');
  const [tripCity, setTripCity] = useState<string | null>(null);
  const [mode, setMode] = useState<string>(() => modeForDate());

  // Pick up ?mode=church from /modes navigation
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlMode = new URLSearchParams(window.location.search).get('mode');
    if (urlMode) {
      setMode(urlMode);
      const clean = window.location.pathname;
      window.history.replaceState(null, '', clean);
    }
  }, []);
  const [items, setItems] = useState<Item[]>([]);
  const [outfits, setOutfits] = useState<GeneratedOutfit[]>([]);
  const [generating, setGenerating] = useState(false);
  const [wornOutfitIdx, setWornOutfitIdx] = useState<number | null>(null);
  const [savedIdxs, setSavedIdxs] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Fetch items (browser) so outfit cards can resolve ids → thumbnails
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

  // Geolocate → weather
  useEffect(() => {
    const fetchWeather = async (params: string) => {
      const r = await fetch(`/api/weather?${params}`);
      if (r.ok) setWeather(await r.json());
      else setWeather(null);
    };

    if (tripCity) {
      void fetchWeather(`city=${encodeURIComponent(tripCity)}`);
      return;
    }

    if (!navigator.geolocation) {
      void fetchWeather('');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        void fetchWeather(`lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
      },
      () => {
        void fetchWeather('');
      },
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
      if (!tripCity && coords) {
        body.lat = coords.lat;
        body.lon = coords.lon;
      }
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Generation failed');
      } else {
        setOutfits(data.outfits as GeneratedOutfit[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setGenerating(false);
    }
  }, [mode, environment, tripCity, coords]);

  const markWorn = useCallback(
    async (idx: number) => {
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
        context: {
          temp_c: effectiveTempC ?? weather?.temp_c,
          condition: weather?.condition,
          environment,
          mode,
          city: weather?.city,
        },
      });
      // bump item counters
      for (const id of o.items) {
        const current = items.find((i) => i.id === id);
        await supa
          .from('items')
          .update({ times_worn: (current?.times_worn ?? 0) + 1, last_worn_at: now })
          .eq('id', id);
      }
    },
    [outfits, savedIdxs, effectiveTempC, weather, environment, mode, items]
  );

  const toggleSave = useCallback((idx: number) => {
    setSavedIdxs((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });

  return (
    <main className="min-h-dvh pb-4">
      <OneUIHeader
        eyebrow="TODAY"
        title="What do you wear?"
        subtitle={`${today}${weather?.city ? ` · ${weather.city}` : ''}`}
        right={
          <Link
            href="/wardrobe/add"
            className="press h-11 w-11 rounded-full bg-crimson-gradient shadow-crimson-glow flex items-center justify-center text-white"
            aria-label="Add item"
          >
            <Plus size={20} />
          </Link>
        }
      />

      <div className="reach-zone">
        <WeatherWidget
          weather={weather}
          effectiveTempC={environment === 'indoor-ac' ? INDOOR_AC_TEMP_C : undefined}
          tripCity={tripCity}
        />

        <EnvironmentToggle value={environment} onChange={setEnvironment} />

        <div className="flex">
          <TripModePicker tripCity={tripCity} onChange={setTripCity} />
        </div>

        <ModeSelector value={mode} onChange={setMode} />

        <GenerateButton onClick={generate} loading={generating} />

        {error && (
          <div className="rounded-squircle-sm bg-crimson-700/30 border border-crimson-700 px-4 py-3 text-oneui-body text-crimson-100">
            {error}
          </div>
        )}

        {outfits.length > 0 && (
          <div className="flex flex-col gap-3 mt-2">
            <h2 className="oneui-hero-sub px-1">Fresh for you</h2>
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

        {items.length === 0 && !generating && (
          <div className="rounded-squircle-sm bg-ink-100 px-4 py-5 text-center text-fog-300 text-oneui-body">
            Your wardrobe is empty. Add a few pieces, then come back here to generate your first fit.
          </div>
        )}
      </div>
    </main>
  );
}
