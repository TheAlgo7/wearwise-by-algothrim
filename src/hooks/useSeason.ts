'use client';

import { resolveSeason, type Season } from '@/lib/season';
import { readCachedWeather } from '@/lib/weather-cache';
import type { WeatherSnapshot } from '@/types';
import { useCallback, useEffect, useMemo, useState } from 'react';

const OVERRIDE_KEY = 'wearwise.season.override';

function readOverride(): Season | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(OVERRIDE_KEY);
  return raw === 'summer' || raw === 'monsoon' || raw === 'autumn' || raw === 'winter' ? raw : null;
}

/**
 * The season the app is currently dressing for.
 *
 * Auto by default (live weather, calendar as fallback). A manual pick sticks
 * across sessions until cleared, so "I am in Manali this week" survives a
 * reload without being a setting he has to remember to undo.
 */
export function useSeason(weather: WeatherSnapshot | null) {
  const [override, setOverrideState] = useState<Season | null>(null);
  const [cached, setCached] = useState<WeatherSnapshot | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // localStorage is read after mount so server and first client render match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOverrideState(readOverride());
    setCached(readCachedWeather());
    setHydrated(true);
  }, []);

  const setOverride = useCallback((next: Season | null) => {
    setOverrideState(next);
    if (typeof window === 'undefined') return;
    if (next) window.localStorage.setItem(OVERRIDE_KEY, next);
    else window.localStorage.removeItem(OVERRIDE_KEY);
  }, []);

  // Live reading wins; the shared cache covers pages that never fetch weather.
  const effectiveWeather = weather ?? cached;

  const { season, source } = useMemo(
    () =>
      resolveSeason(
        override,
        effectiveWeather ? { temp_c: effectiveWeather.temp_c, humidity: effectiveWeather.humidity } : null
      ),
    [override, effectiveWeather]
  );

  /** Tapping the active season returns to auto; tapping another pins it. */
  const toggle = useCallback(
    (next: Season) => setOverride(override === next ? null : next),
    [override, setOverride]
  );

  return { season, source, override, setOverride, toggle, hydrated, weather: effectiveWeather };
}
