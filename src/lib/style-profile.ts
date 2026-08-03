import { createAdminClient } from '@/lib/supabase/server';
import { STYLE_PROFILE_ID, type StyleProfile } from '@/lib/supabase/types';

/**
 * Internal physical/grooming constants — used only for AI context, never rendered in the UI.
 * Keep these server-side only.
 */
const INTERNAL = {
  height_cm: 178,
  weight_kg: 65,
  body_type: 'tall, lean frame — long torso, long legs, narrow shoulders, narrow upper arms with defined forearms. Warm tan complexion.',
  hairstyle: `Textured Side-Swept Undercut with a Fade (Modern Textured Quiff).
Cut: high mid-fade / blended skin fade on sides and back. Top kept ~3–4 inches, heavily layered and texturized (point-cut) for movement and volume. Fringe swept diagonally across the forehead. Slight disconnection at the part line — top sweeps cleanly over faded sides without blending.
Styling: swept up and to the side with sea salt spray + volumizing powder; matte, piecey finish (not slicked back).`,
};

/**
 * Gaurav's style profile — hardcoded as the baseline.
 * This is a single-user private app; this profile is always the floor.
 * Supabase row (if it exists) merges on top of this, so any saved tweaks win.
 */
const FALLBACK: StyleProfile = {
  id: STYLE_PROFILE_ID,
  user_name: 'Gaurav Kumar',
  height_cm: INTERNAL.height_cm,
  weight_kg: INTERNAL.weight_kg,
  body_type: INTERNAL.body_type,
  preferred_fits: ['bootcut', 'oversized', 'relaxed'],
  // Kept deliberately wide: this list reaches the prompt verbatim as "Palette",
  // and a short neutral-only list is what made every generation come back
  // black-and-white despite 24 coloured pieces hanging in the wardrobe.
  preferred_colors: [
    'black', 'navy', 'white', 'cream', 'charcoal', 'beige', 'tan', 'coffee', 'sand',
    'burgundy', 'maroon', 'olive', 'teal', 'mustard', 'dusty rose', 'lilac', 'indigo',
  ],
  avoided_colors: [],
  avoided_combinations: [
    { items: ['skinny jeans', 'any top'], reason: 'exaggerates thin frame — bootcut only' },
    { items: ['straight-fit trousers', 'any top'], reason: 'same reason — no straight or slim cut bottoms' },
    { items: ['tie', 'polo'], reason: 'never tie with polo or knitwear' },
    { items: ['gold jewelry', 'any outfit'], reason: 'silver only, no gold' },
  ],
  signature_combos: [
    {
      name: 'The Algo Stack',
      items: ['oversized boxy tee', 'bootcut jeans (normal tab)', 'heavy sneakers'],
      vibe: 'casual street',
    },
    {
      name: 'Clean Elevated',
      items: ['linen/Cuban collar shirt (relaxed)', 'bootcut trousers (Gurkha tab, shirt tucked)', 'Chelsea boots'],
      vibe: 'smart-casual',
    },
    {
      name: 'Street Flex',
      items: ['drop-shoulder tee', 'bootcut cargos', 'Travis Scott / Dunk sneakers'],
      vibe: 'streetwear',
    },
  ],
  notes: `SILHOUETTE RULE: Japanese bootcut silhouette is non-negotiable for the lower body.
Pants: slim through thighs, subtle flare from knee — mid-rise, deliberate long hem (puddle/full break over shoes).
Gurkha/extended-tab waistband → dressy colours (black, light beige) → shirt always tucked.
Normal tab → casual colours (dark grey, sand, coffee brown) → oversized tee worn untucked.
Tops: must add upper-body volume to balance wide hem — boxy/drop-shoulder/oversized only.
Sleeve hack: roll button-down sleeves to just below elbow — forearms on show, cleaner proportion.
Footwear: chunky to match bootcut puddle hem — Chelsea boots for formal/smart, heavy sneakers for casual/street.
Accessories: silver only (no gold). Watch always on left wrist.
Body note: long torso needs mid-rise (not low-rise) to avoid exaggerating height imbalance.`,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * The non-negotiable styling rules.
 *
 * Held separately from `notes` so they always reach the prompt. They used to
 * live only inside the fallback notes string, and formatBlueprint looked for a
 * "SILHOUETTE RULE" marker to find them. A saved DB row replaced those notes
 * with free prose that has no such marker, so the lookup silently fell back to
 * "first 400 characters" and shipped a truncated biography instead of a single
 * rule. Every generation ran without them.
 */
export const HARD_RULES = `Bottoms: Japanese bootcut only — slim through the thigh, subtle flare from the knee, mid-rise, long puddle hem breaking over the shoe. NEVER skinny, slim or straight cut.
Gurkha/extended-tab waistband → dressier colours → shirt always tucked. Normal tab → casual colours → tee worn untucked.
Tops: boxy, drop-shoulder or oversized, to add upper-body volume against the wide hem.
Sleeves: roll button-down sleeves to just below the elbow — forearms on show.
Footwear: chunky enough to carry the puddle hem. Chelsea boots when elevated, heavy sneakers when casual.
Accessories: silver only, never gold. Watch on the left wrist. Never a tie with a polo or knitwear.
Long torso needs mid-rise, never low-rise.`;

function mergeAvoided(
  base: StyleProfile['avoided_combinations'],
  extra?: StyleProfile['avoided_combinations']
): StyleProfile['avoided_combinations'] {
  const out = [...base];
  for (const c of extra ?? []) {
    const key = c.items.join('|').toLowerCase();
    if (!out.some((x) => x.items.join('|').toLowerCase() === key)) out.push(c);
  }
  return out;
}

export async function getStyleProfile(): Promise<StyleProfile> {
  try {
    const supa = createAdminClient();
    const { data, error } = await supa
      .from('style_profile')
      .select('*')
      .eq('id', STYLE_PROFILE_ID)
      .single();
    if (error || !data) return FALLBACK;
    // Merge: hardcoded profile is the floor, DB row fills any fields that were saved.
    // Arrays: use DB value only if non-empty (otherwise keep hardcoded defaults).
    const db = data as StyleProfile;
    return {
      ...FALLBACK,
      ...db,
      preferred_fits:      db.preferred_fits?.length      ? db.preferred_fits      : FALLBACK.preferred_fits,
      preferred_colors:    db.preferred_colors?.length    ? db.preferred_colors    : FALLBACK.preferred_colors,
      avoided_colors:      db.avoided_colors?.length      ? db.avoided_colors      : FALLBACK.avoided_colors,
      // Union, not replace. A saved DB row used to shadow the hardcoded rules
      // entirely, which quietly dropped "never a tie with a polo" and
      // "silver only, no gold" from every prompt.
      avoided_combinations: mergeAvoided(FALLBACK.avoided_combinations, db.avoided_combinations),
      signature_combos:    db.signature_combos?.length    ? db.signature_combos    : FALLBACK.signature_combos,
      body_type:           db.body_type                   ?? FALLBACK.body_type,
      notes:               db.notes                       ?? FALLBACK.notes,
      height_cm:           db.height_cm                   ?? FALLBACK.height_cm,
      weight_kg:           db.weight_kg                   ?? FALLBACK.weight_kg,
    };
  } catch {
    return FALLBACK;
  }
}

/** Compact, prompt-friendly style blueprint — structured fields only, no full essay. */
export function formatBlueprint(p: StyleProfile): string {
  const parts: string[] = [];
  parts.push(`Owner: ${p.user_name}${p.height_cm ? ` · ${p.height_cm}cm` : ''}`);
  if (p.body_type) parts.push(`Build: ${p.body_type}`);
  parts.push(`Hairstyle: ${INTERNAL.hairstyle.replace(/\n+/g, ' ').trim()}`);
  if (p.preferred_fits.length)   parts.push(`Fits: ${p.preferred_fits.join(', ')}`);
  if (p.preferred_colors.length) parts.push(`Palette: ${p.preferred_colors.join(', ')}`);
  if (p.avoided_colors.length)   parts.push(`Avoid colours: ${p.avoided_colors.join(', ')}`);
  if (p.avoided_combinations.length) {
    parts.push(`Hard rules: ${p.avoided_combinations
      .map((c) => `never ${c.items.join(' + ')} (${c.reason})`)
      .join('; ')}`);
  }
  if (p.signature_combos.length) {
    parts.push(`Signature combos: ${p.signature_combos
      .map((c) => `[${c.name}] ${c.items.join(' · ')}`)
      .join(' | ')}`);
  }
  // The hard rules are unconditional — never derived from whatever prose
  // happens to be saved in `notes`.
  parts.push(`Hard styling rules: ${HARD_RULES.replace(/\n+/g, ' ').trim()}`);

  // Personal notes are supplementary colour, trimmed only to bound prompt size.
  // Cut on a sentence boundary so the model never receives a half-word.
  if (p.notes?.trim()) {
    const flat = p.notes.replace(/\s+/g, ' ').trim();
    const capped = flat.length <= 900 ? flat : flat.slice(0, flat.lastIndexOf('.', 900) + 1 || 900);
    parts.push(`Owner notes: ${capped}`);
  }
  return parts.join('\n');
}
