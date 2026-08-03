/**
 * Two people use this app.
 *
 * `owner`   — Gaurav. Full control: generate, add, edit, archive, wear.
 * `partner` — Ishita. Browses his wardrobe, builds looks for him, leaves notes.
 *             She cannot edit or delete anything he owns.
 *
 * The role is decided by which PIN was entered at /unlock and is carried in an
 * httpOnly cookie. Everything downstream (theme, nav, permissions) reads it.
 */

export const ROLES = ['owner', 'partner'] as const;
export type Role = (typeof ROLES)[number];

export const AUTH_COOKIE = 'ww_auth';

export const ROLE_NAMES: Record<Role, string> = {
  owner: 'Gaurav',
  partner: 'Ishita',
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

/**
 * Cookie payload for a role. The role is folded into the hash so a partner
 * session can never be replayed as an owner session (and vice versa) even if
 * one of the PINs leaks.
 */
export async function roleToken(role: Role, pin: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${role}:${pin}`)
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** PINs currently configured in the environment, owner first. */
export function configuredPins(): Array<{ role: Role; pin: string }> {
  const owner = process.env.APP_PIN?.trim();
  const partner = process.env.PARTNER_PIN?.trim();
  const out: Array<{ role: Role; pin: string }> = [];
  if (owner) out.push({ role: 'owner', pin: owner });
  // A partner PIN identical to the owner's would silently shadow it; ignore that.
  if (partner && partner !== owner) out.push({ role: 'partner', pin: partner });
  return out;
}

/** Which role, if any, a presented cookie value corresponds to. */
export async function roleForToken(token: string | undefined): Promise<Role | null> {
  if (!token) return null;
  for (const { role, pin } of configuredPins()) {
    if (token === (await roleToken(role, pin))) return role;
  }
  return null;
}
