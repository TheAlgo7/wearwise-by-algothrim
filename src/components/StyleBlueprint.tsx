'use client';

import { OneUIButton, OneUIChip, Squircle } from '@/components/oneui';
import { swatchFor } from '@/lib/colour-story';
import { FITS } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { STYLE_PROFILE_ID, type AvoidedCombination, type SignatureCombo, type StyleProfile } from '@/lib/supabase/types';
import { Check, Loader2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';

const DEFAULT_COLORS = ['black','white','cream','beige','olive','charcoal','navy','denim','tan','grey','brown','rust','burgundy'];

const COLOR_HEX: Record<string, string> = {
  black: '#050505',
  white: '#F5EEF0',
  cream: '#EFE3C7',
  beige: '#CBB795',
  olive: '#6F7751',
  charcoal: '#2F2C30',
  navy: '#192A43',
  denim: '#3B5F86',
  tan: '#B9895D',
  grey: '#7A6870',
  brown: '#6F4D37',
  rust: '#9B4B32',
  burgundy: '#6F1635',
};

/** Shared garment swatches first, the blueprint's own list as a fallback. */
const hexFor = (c: string) => swatchFor(c) ?? COLOR_HEX[c] ?? '#6E5F61';

/**
 * Every colour worth offering: whatever is already in the blueprint, then the
 * defaults. The chips used to show only the 13 defaults, so 8 of his 14 saved
 * colours (coffee, sand, maroon, teal...) could be neither seen nor removed.
 */
const paletteOptions = (profile: StyleProfile) =>
  Array.from(new Set([...profile.preferred_colors, ...(profile.avoided_colors ?? []), ...DEFAULT_COLORS]));

const serializeSignatureCombos =(combos: SignatureCombo[]) =>
  combos.map((c) => [c.name, c.vibe].filter(Boolean).join(' | ')).join('\n');

const parseSignatureCombos = (text: string): SignatureCombo[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, vibe] = line.split('|').map((part) => part.trim());
      return { name, vibe: vibe || undefined, items: [] };
    });

const serializeAvoidedCombos = (combos: AvoidedCombination[]) =>
  combos.map((c) => [c.reason, c.items.join(', ')].filter(Boolean).join(' | ')).join('\n');

const parseAvoidedCombos = (text: string): AvoidedCombination[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [reason, items = ''] = line.split('|').map((part) => part.trim());
      return { reason, items: items ? items.split(',').map((item) => item.trim()).filter(Boolean) : [] };
    });

export function StyleBlueprint() {
  const [profile, setProfile] = useState<StyleProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const supa = createClient();
    (async () => {
      const { data } = await supa
        .from('style_profile')
        .select('*')
        .eq('id', STYLE_PROFILE_ID)
        .maybeSingle();
      if (data) setProfile(data as StyleProfile);
      else
        setProfile({
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
        });
    })();
  }, []);

  const set = <K extends keyof StyleProfile>(k: K, v: StyleProfile[K]) => {
    setProfile((p) => (p ? { ...p, [k]: v } : p));
  };

  const toggle = (k: 'preferred_fits' | 'preferred_colors' | 'avoided_colors', v: string) => {
    if (!profile) return;
    const arr = (profile[k] as string[]) ?? [];
    set(k, (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]) as StyleProfile[typeof k]);
  };

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    setSaved(false);
    const { id: _ignore, created_at: _c, updated_at: _u, ...rest } = profile;
    void _ignore; void _c; void _u;
    const res = await fetch('/api/style-profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rest),
    }).catch(() => null);
    setSaving(false);
    // Only claim "Saved" when it actually saved.
    if (res?.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  };

  if (!profile) {
    return (
      <Squircle variant="raised" className="p-6 flex items-center gap-3">
        <Loader2 className="animate-spin text-crimson-300" size={20} />
        <span className="text-oneui-body text-fog-300">Loading blueprint…</span>
      </Squircle>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* A sentence, not three stat tiles. "Frame: Set / Palette: 14 / Avoid: 0"
          was a dashboard for a form; this reads back what the stylist knows. */}
      <Squircle variant="raised" className="p-4">
        <p className="text-oneui-h text-fog-100">Style DNA</p>
        <p className="mt-1.5 text-[14px] leading-[1.55] text-fog-300 text-pretty">
          {[
            profile.height_cm ? `${profile.height_cm} cm` : null,
            profile.preferred_fits.length ? `${profile.preferred_fits.slice(0, 3).join(', ')} fits` : null,
            profile.preferred_colors.length
              ? `${profile.preferred_colors.length} colours you wear`
              : null,
            (profile.avoided_colors ?? []).length
              ? `${(profile.avoided_colors ?? []).length} you avoid`
              : null,
          ].filter(Boolean).join(' · ') || 'Add your fit and rules.'}
        </p>
        {profile.preferred_colors.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5" aria-hidden>
            {profile.preferred_colors.map((c) => (
              <span
                key={c}
                className="h-5 w-5 rounded-full ring-1 ring-inset ring-white/[0.18]"
                style={{ background: hexFor(c) }}
              />
            ))}
          </div>
        )}
      </Squircle>

      <Squircle variant="raised" className="p-4 flex flex-col gap-3">
        <Field label="Owner name" htmlFor="bp-owner-name">
          <input
            id="bp-owner-name"
            value={profile.user_name}
            onChange={(e) => set('user_name', e.target.value)}
            className="w-full h-12 px-4 rounded-squircle-sm bg-ink-200 border border-white/[0.06] text-fog-100 outline-none focus:border-crimson-300"
          />
        </Field>
        <Field label="Height (cm)" htmlFor="bp-height">
          <input
            id="bp-height"
            type="number"
            value={profile.height_cm ?? ''}
            onChange={(e) => set('height_cm', e.target.value === '' ? null : Number(e.target.value))}
            className="w-full h-12 px-4 rounded-squircle-sm bg-ink-200 border border-white/[0.06] text-fog-100 outline-none focus:border-crimson-300"
          />
        </Field>
      </Squircle>

      <Squircle variant="raised" className="p-4">
        <Field label="Preferred fits">
          <div className="flex flex-wrap gap-2">
            {FITS.map((f) => (
              <OneUIChip key={f} active={profile.preferred_fits.includes(f)} onClick={() => toggle('preferred_fits', f)}>
                {f}
              </OneUIChip>
            ))}
          </div>
        </Field>
      </Squircle>

      <Squircle variant="raised" className="p-4">
        <Field label="Preferred palette">
          <div className="flex flex-wrap gap-2">
            {paletteOptions(profile).map((c) => (
              <OneUIChip
                key={c}
                active={profile.preferred_colors.includes(c)}
                onClick={() => toggle('preferred_colors', c)}
                leftIcon={<Swatch color={hexFor(c)} />}
              >
                {c}
              </OneUIChip>
            ))}
          </div>
        </Field>
      </Squircle>

      <Squircle variant="raised" className="p-4">
        <Field label="Avoid these colors">
          <div className="flex flex-wrap gap-2">
            {paletteOptions(profile).map((c) => (
              <OneUIChip
                key={c}
                active={(profile.avoided_colors ?? []).includes(c)}
                onClick={() => toggle('avoided_colors', c)}
                leftIcon={<Swatch color={hexFor(c)} />}
              >
                {c}
              </OneUIChip>
            ))}
          </div>
        </Field>
      </Squircle>

      <Squircle variant="raised" className="p-4">
        <Field label="Signature combos" htmlFor="bp-sig-combos">
          <textarea
            id="bp-sig-combos"
            rows={3}
            value={serializeSignatureCombos(profile.signature_combos)}
            placeholder="black tee + relaxed denim | casual"
            onChange={(e) => set('signature_combos', parseSignatureCombos(e.target.value))}
            className="w-full min-h-24 p-4 rounded-squircle-sm bg-ink-200 border border-white/[0.06] text-fog-100 outline-none focus:border-crimson-300"
          />
        </Field>
      </Squircle>

      <Squircle variant="raised" className="p-4">
        <Field label="Avoided combinations" htmlFor="bp-avoided-combos">
          <textarea
            id="bp-avoided-combos"
            rows={3}
            value={serializeAvoidedCombos(profile.avoided_combinations)}
            placeholder="skinny jeans with chunky sneakers | bad proportion"
            onChange={(e) => set('avoided_combinations', parseAvoidedCombos(e.target.value))}
            className="w-full min-h-24 p-4 rounded-squircle-sm bg-ink-200 border border-white/[0.06] text-fog-100 outline-none focus:border-crimson-300"
          />
        </Field>
      </Squircle>

      <Squircle variant="raised" className="p-4">
        <Field label="Style rules" htmlFor="bp-style-rules">
          <textarea
            id="bp-style-rules"
            rows={4}
            value={profile.notes ?? ''}
            placeholder='e.g. "never tuck in oversized tees", "always silver jewelry, no gold"'
            onChange={(e) => set('notes', e.target.value || null)}
            className="w-full min-h-24 p-4 rounded-squircle-sm bg-ink-200 border border-white/[0.06] text-fog-100 outline-none focus:border-crimson-300"
          />
        </Field>
      </Squircle>

      <OneUIButton
        size="lg"
        fullWidth
        onClick={save}
        leftIcon={saving ? <Loader2 className="animate-spin" size={16} /> : saved ? <Check size={16} /> : <Save size={16} />}
      >
        {saving ? 'Saving…' : saved ? 'Saved' : 'Save blueprint'}
      </OneUIButton>
    </div>
  );
}

function Swatch({ color }: { color: string }) {
  return (
    <span
      className="h-3.5 w-3.5 rounded-full border border-white/20"
      style={{ background: color }}
      aria-hidden
    />
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="oneui-hero-sub text-fog-400">{label}</label>
      ) : (
        <span className="oneui-hero-sub text-fog-400">{label}</span>
      )}
      {children}
    </div>
  );
}
