import type { WeatherSnapshot } from '@/types';

/**
 * Last known weather, shared across pages.
 *
 * Only the home screen asks for geolocation and fetches weather. Every other
 * page still needs a temperature to resolve the season, and asking for a fix
 * on each route would be slow and would re-prompt for permission. This caches
 * the last reading so the wardrobe and looks pages inherit it.
 */

const KEY = 'wearwise.weather.last';
const MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2h — beyond this, fall back to the calendar

interface Cached {
  at: number;
  snapshot: WeatherSnapshot;
}

export function cacheWeather(snapshot: WeatherSnapshot | null) {
  if (typeof window === 'undefined' || !snapshot) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), snapshot } satisfies Cached));
  } catch {
    /* storage blocked; the calendar fallback still works */
  }
}

export function readCachedWeather(): WeatherSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (!parsed?.snapshot || Date.now() - parsed.at > MAX_AGE_MS) return null;
    return parsed.snapshot;
  } catch {
    return null;
  }
}
