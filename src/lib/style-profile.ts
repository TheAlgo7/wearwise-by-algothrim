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

/** Compact, prompt-friendly string representation of the Style Blueprint. */
export function formatBlueprint(p: StyleProfile): string {
  const parts: string[] = [];
  parts.push(`Owner: ${p.user_name}`);
  if (p.body_type) parts.push(`Body: ${p.body_type}`);
  if (p.height_cm) parts.push(`Height: ${p.height_cm}cm`);
  if (p.weight_kg) parts.push(`Weight: ${p.weight_kg}kg`);
  if (p.preferred_fits.length)   parts.push(`Preferred fits: ${p.preferred_fits.join(', ')}`);
  if (p.preferred_colors.length) parts.push(`Palette: ${p.preferred_colors.join(', ')}`);
  if (p.avoided_colors.length)   parts.push(`Avoid colors: ${p.avoided_colors.join(', ')}`);
  if (p.avoided_combinations.length) {
    parts.push(`Never wear together: ${p.avoided_combinations
      .map((c) => `${c.items.join(' + ')} (${c.reason})`)
      .join('; ')}`);
  }
  if (p.signature_combos.length) {
    parts.push(`Signature combos: ${p.signature_combos
      .map((c) => `[${c.name}] ${c.items.join(' + ')}${c.vibe ? ' — ' + c.vibe : ''}`)
      .join('; ')}`);
  }
  if (p.notes) parts.push(`Notes: ${p.notes}`);
  return parts.join('\n');
}
