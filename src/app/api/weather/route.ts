import { NextResponse } from 'next/server';
import { getWeatherByCity, getWeatherByCoords } from '@/lib/weather';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const city = searchParams.get('city');

  try {
    const snap =
      lat && lon
        ? await getWeatherByCoords(parseFloat(lat), parseFloat(lon))
        : await getWeatherByCity(city ?? process.env.NEXT_PUBLIC_DEFAULT_CITY ?? 'New Delhi,IN');
    return NextResponse.json(snap);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'weather unavailable';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
