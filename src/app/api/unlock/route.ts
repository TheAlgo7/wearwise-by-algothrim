import { NextResponse } from 'next/server';
import { AUTH_COOKIE, configuredPins, roleToken } from '@/lib/roles';

export const runtime = 'nodejs';

const COOKIE_MAX_AGE_S = 60 * 60 * 24 * 400; // 400d — Chrome's ceiling, refreshed on every visit

export async function POST(req: Request) {
  const pins = configuredPins();
  if (pins.length === 0) return NextResponse.json({ ok: true, role: 'owner' }); // gate not configured

  let body: { pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const entered = body.pin?.trim();
  const match = pins.find((p) => p.pin === entered);

  if (!match) {
    // Slow down brute force a touch; two-user app, keep it simple.
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({ error: 'Wrong PIN' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, role: match.role });
  res.cookies.set(AUTH_COOKIE, await roleToken(match.role, match.pin), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE_S,
    path: '/',
  });
  return res;
}
