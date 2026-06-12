import { NextResponse, type NextRequest } from 'next/server';

/**
 * Single-user PIN gate. Active only when APP_PIN is set in the environment —
 * without it the app stays open (local dev, or before the Vercel env is added).
 *
 * The cookie stores a SHA-256 of the PIN, set once by /api/unlock and valid
 * for a year, so the phone unlocks once and never asks again.
 */

const COOKIE = 'ww_auth';

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function proxy(req: NextRequest) {
  const pin = process.env.APP_PIN;
  if (!pin) return NextResponse.next();

  const expected = await sha256Hex(pin);
  if (req.cookies.get(COOKIE)?.value === expected) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = '/unlock';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except the unlock flow, PWA plumbing, and static assets.
  matcher: [
    '/((?!unlock|api/unlock|offline|_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest|sw\\.js|icons/|apple-touch-icon).*)',
  ],
};
