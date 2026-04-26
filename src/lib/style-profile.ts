import { createAdminClient } from '@/lib/supabase/server';
import { STYLE_PROFILE_ID, type StyleProfile } from '@/lib/supabase/types';

/**
 * Gaurav's style profile — hardcoded as the baseline.
 * This is a single-user private app; this profile is always the floor.
 * Supabase row (if it exists) merges on top of this, so any saved tweaks win.
 */
const FALLBACK: StyleProfile = {
  id: STYLE_PROFILE_ID,
  user_name: 'Gaurav Kumar',
  height_cm: 178,
  weight_kg: 65,
  body_type: 'tall, lean frame — long torso, long legs, narrow shoulders, thin upper arms with good forearm definition. Warm tan complexion.',
  preferred_fits: ['bootcut', 'oversized', 'relaxed'],
  preferred_colors: ['black', 'navy', 'white', 'cream', 'charcoal', 'olive', 'tan', 'burgundy'],
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
Sleeve hack: roll button-down sleeves to just below elbow — hides thin biceps, shows forearms.
Footwear: chunky to match bootcut puddle hem — Chelsea boots for formal/smart, heavy sneakers for casual/street.
Accessories: silver only (no gold). Watch always on left wrist.
Body note: long torso needs mid-rise (not low-rise) to avoid exaggerating height imbalance.`,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

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
      avoided_combinations:db.avoided_combinations?.length? db.avoided_combinations: FALLBACK.avoided_combinations,
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
  // Append only the hard-rule section from notes (first 400 chars max)
  if (p.notes) {
    const hardRuleStart = p.notes.indexOf('SILHOUETTE RULE');
    const excerpt = hardRuleStart !== -1
      ? p.notes.slice(hardRuleStart, hardRuleStart + 400)
      : p.notes.slice(0, 400);
    parts.push(`Key rules: ${excerpt.replace(/\n+/g, ' ').trim()}`);
  }
  return parts.join('\n');
}
