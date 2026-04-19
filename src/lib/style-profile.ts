import { createAdminClient } from '@/lib/supabase/server';
import { STYLE_PROFILE_ID, type StyleProfile } from '@/lib/supabase/types';

const FALLBACK: StyleProfile = {
  id: STYLE_PROFILE_ID,
  user_name: 'Gaurav Kumar',
  height_cm: null,
  weight_kg: null,
  body_type: null,
  preferred_fits: [],
  preferred_colors: [],
  avoided_colors: [],
  avoided_combinations: [],
  signature_combos: [],
  notes: null,
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
    return data as StyleProfile;
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
