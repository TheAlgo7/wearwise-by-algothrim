import { INDOOR_AC_TEMP_C } from '@/lib/constants';
import type { WeatherSnapshot } from '@/types';

const BASE = 'https://api.openweathermap.org/data/2.5';

interface OWResponse {
  name: string;
  sys: { country: string; sunrise: number; sunset: number };
  main: { temp: number; feels_like: number; humidity: number };
  weather: { main: string; description: string; icon: string }[];
  wind: { speed: number };
  dt: number;
}

function toSnapshot(d: OWResponse): WeatherSnapshot {
  const now = d.dt || Math.floor(Date.now() / 1000);
  const isNight = now < d.sys.sunrise || now > d.sys.sunset;
  return {
    temp_c: Math.round(d.main.temp * 10) / 10,
    feels_like_c: Math.round(d.main.feels_like * 10) / 10,
    condition: d.weather[0]?.description ?? d.weather[0]?.main ?? 'clear',
    icon: d.weather[0]?.icon ?? '01d',
    humidity: d.main.humidity,
    wind_kph: Math.round(d.wind.speed * 3.6 * 10) / 10,
    city: d.name,
    country: d.sys.country,
    is_night: isNight,
    fetched_at: new Date().toISOString(),
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 600 } }); // 10-min edge cache
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenWeather ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function getWeatherByCoords(lat: number, lon: number): Promise<WeatherSnapshot> {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) throw new Error('OPENWEATHER_API_KEY not set');
  const url = `${BASE}/weather?lat=${lat}&lon=${lon}&appid=${key}&units=metric`;
  return toSnapshot(await fetchJson<OWResponse>(url));
}

export async function getWeatherByCity(city: string): Promise<WeatherSnapshot> {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) throw new Error('OPENWEATHER_API_KEY not set');
  const url = `${BASE}/weather?q=${encodeURIComponent(city)}&appid=${key}&units=metric`;
  return toSnapshot(await fetchJson<OWResponse>(url));
}

/**
 * Gaurav's timezone, stated explicitly.
 *
 * timeOfDay runs inside the /api/generate route, and Vercel's Node runtime is
 * UTC. Reading date.getHours() there was silently 5h30m out all year: at 16:10
 * in Delhi the stylist was being told it was morning. It only looked correct in
 * local development, where the machine is already on IST.
 */
export const APP_TIMEZONE = 'Asia/Kolkata';

/** Hour of day (0-23) in Gaurav's timezone, regardless of where this runs. */
export function localHour(date: Date = new Date(), timeZone: string = APP_TIMEZONE): number {
  const h = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hourCycle: 'h23' }).format(date)
  );
  // Some ICU builds render midnight as 24; normalise so the buckets below hold.
  return h % 24;
}

export function timeOfDay(date: Date = new Date()): 'morning' | 'afternoon' | 'evening' | 'night' {
  const h = localHour(date);
  if (h < 6)  return 'night';
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 21) return 'evening';
  return 'night';
}

/** Get effective temperature after applying the Indoor-AC override. */
export function effectiveTempC(raw: number, environment: 'outdoor' | 'indoor-ac'): number {
  if (environment === 'indoor-ac') return INDOOR_AC_TEMP_C;
  return raw;
}
