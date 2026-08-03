import 'server-only';

import { cookies } from 'next/headers';
import { AUTH_COOKIE, configuredPins, roleForToken, type Role } from '@/lib/roles';

/**
 * The role for the current request, resolved from the auth cookie.
 *
 * When no PIN is configured at all (local dev, or before the Vercel env vars
 * are set) the gate is off and everyone is the owner — matching the original
 * single-user behaviour.
 */
export async function getRole(): Promise<Role> {
  if (configuredPins().length === 0) return 'owner';
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  return (await roleForToken(token)) ?? 'owner';
}

/** True when the current request may write to Gaurav's wardrobe. */
export async function isOwner(): Promise<boolean> {
  return (await getRole()) === 'owner';
}
