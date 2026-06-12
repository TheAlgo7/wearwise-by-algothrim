import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const COOKIE = 'ww_auth';
const ONE_YEAR_S = 60 * 60 * 24 * 365;

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(req: Request) {
  const pin = process.env.APP_PIN?.trim();
  if (!pin) return NextResponse.json({ ok: true }); // gate not configured

  let body: { pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (body.pin !== pin) {
    // Slow down brute force a touch; single-user app, keep it simple.
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({ error: 'Wrong PIN' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await sha256Hex(pin), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ONE_YEAR_S,
    path: '/',
  });
  return res;
}
