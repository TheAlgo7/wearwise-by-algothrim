import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_COOKIE, configuredPins, roleForToken } from '@/lib/roles';

/**
 * Two-PIN gate. Active only when APP_PIN (Gaurav) or PARTNER_PIN (Ishita) is
 * set in the environment — without either the app stays open for local dev.
 *
 * The cookie stores SHA-256 of `role:pin` and is re-issued on every authorised
 * request (sliding expiry), so the PIN is entered once on each device and never
 * asked for again as long as the app gets opened inside the window.
 */

const COOKIE_MAX_AGE_S = 60 * 60 * 24 * 400; // 400d — Chrome's ceiling for cookie lifetime

/** Owner-only write endpoints. Ishita browses and suggests; she never edits his wardrobe. */
const OWNER_ONLY_API = ['/api/items', '/api/upload', '/api/tag-item', '/api/clean-image', '/api/style-profile'];

/** Pages Ishita has no reason to see. Her nav never links here, this is the backstop. */
const OWNER_ONLY_PAGES = ['/wardrobe/add', '/profile'];

export async function proxy(req: NextRequest) {
  if (configuredPins().length === 0) return NextResponse.next();

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const role = await roleForToken(token);
  const { pathname } = req.nextUrl;

  if (!role) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/unlock';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (role === 'partner') {
    const blockedApi =
      OWNER_ONLY_API.some((p) => pathname.startsWith(p)) ||
      // Item edits/deletes live at /api/items/[id]; reads are client-side via anon key.
      (pathname.startsWith('/api/items/') && req.method !== 'GET');
    if (blockedApi) {
      return NextResponse.json({ error: 'Not your wardrobe to edit' }, { status: 403 });
    }
    if (OWNER_ONLY_PAGES.some((p) => pathname.startsWith(p))) {
      const url = req.nextUrl.clone();
      url.pathname = '/';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  // Slide the expiry forward so an active user never sees the PIN screen twice.
  const res = NextResponse.next();
  res.cookies.set(AUTH_COOKIE, token!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE_S,
    path: '/',
  });
  return res;
}

export const config = {
  // Everything except the unlock flow, PWA plumbing, and static assets.
  matcher: [
    '/((?!unlock|api/unlock|offline|_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest|sw\\.js|icons/|apple-touch-icon).*)',
  ],
};
