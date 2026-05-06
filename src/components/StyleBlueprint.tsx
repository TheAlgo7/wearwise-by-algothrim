'use client';

import { OneUIButton, OneUIChip, Squircle } from '@/components/oneui';
import { FITS } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { STYLE_PROFILE_ID, type AvoidedCombination, type SignatureCombo, type StyleProfile } from '@/lib/supabase/types';
import { Check, Loader2, Palette, Ruler, Save, Sparkles, TriangleAlert } from 'lucide-react';
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

const serializeSignatureCombos = (combos: SignatureCombo[]) =>
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
    const arr = profile[k];
    set(k, (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]) as StyleProfile[typeof k]);
  };

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    setSaved(false);
    const supa = createClient();
    const { id: _ignore, created_at: _c, updated_at: _u, ...rest } = profile;
    void _ignore; void _c; void _u;
    await supa.from('style_profile').upsert({ id: STYLE_PROFILE_ID, ...rest });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
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
      <Squircle variant="raised" className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-full flex items-center justify-center shrink-0 bg-[#E2335D]/15">
            <Sparkles size={20} style={{ color: '#FF86A0' }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-oneui-h text-[#FFEDE8]">Style DNA</p>
            <p className="mt-1 text-oneui-cap text-[#FFD9DA]/60 text-pretty">
              {[
                profile.height_cm ? `${profile.height_cm} cm` : null,
                profile.weight_kg ? `${profile.weight_kg} kg` : null,
                profile.preferred_fits.length ? `${profile.preferred_fits.slice(0, 3).join(', ')} fits` : null,
              ].filter(Boolean).join(' · ') || 'Add your fit, frame, and rules.'}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat icon={<Ruler size={15} />} label="Frame" value={profile.body_type ? 'Set' : 'Open'} />
          <Stat icon={<Palette size={15} />} label="Palette" value={`${profile.preferred_colors.length}`} />
          <Stat icon={<TriangleAlert size={15} />} label="Avoid" value={`${profile.avoided_colors.length}`} />
        </div>
      </Squircle>

      <Squircle variant="raised" className="p-4 flex flex-col gap-3">
        <Field label="Owner name">
          <input
            value={profile.user_name}
            onChange={(e) => set('user_name', e.target.value)}
            className="w-full h-12 px-4 rounded-squircle-sm bg-ink-200 border border-white/[0.06] text-fog-100 outline-none focus:border-crimson-300"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Height (cm)">
            <input
              type="number"
              value={profile.height_cm ?? ''}
              onChange={(e) => set('height_cm', e.target.value === '' ? null : Number(e.target.value))}
              className="w-full h-12 px-4 rounded-squircle-sm bg-ink-200 border border-white/[0.06] text-fog-100 outline-none focus:border-crimson-300"
            />
          </Field>
          <Field label="Weight (kg)">
            <input
              type="number"
              value={profile.weight_kg ?? ''}
              onChange={(e) => set('weight_kg', e.target.value === '' ? null : Number(e.target.value))}
              className="w-full h-12 px-4 rounded-squircle-sm bg-ink-200 border border-white/[0.06] text-fog-100 outline-none focus:border-crimson-300"
            />
          </Field>
        </div>
        <Field label="Body type">
          <input
            value={profile.body_type ?? ''}
            placeholder='e.g. "lean athletic", "stocky", "tall slim"'
            onChange={(e) => set('body_type', e.target.value || null)}
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
            {DEFAULT_COLORS.map((c) => (
              <OneUIChip
                key={c}
                active={profile.preferred_colors.includes(c)}
                onClick={() => toggle('preferred_colors', c)}
                leftIcon={<Swatch color={COLOR_HEX[c]} />}
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
            {DEFAULT_COLORS.map((c) => (
              <OneUIChip
                key={c}
                active={profile.avoided_colors.includes(c)}
                onClick={() => toggle('avoided_colors', c)}
                leftIcon={<Swatch color={COLOR_HEX[c]} />}
              >
                {c}
              </OneUIChip>
            ))}
          </div>
        </Field>
      </Squircle>

      <Squircle variant="raised" className="p-4">
        <Field label="Signature combos">
          <textarea
            rows={3}
            value={serializeSignatureCombos(profile.signature_combos)}
            placeholder="black tee + relaxed denim | casual"
            onChange={(e) => set('signature_combos', parseSignatureCombos(e.target.value))}
            className="w-full min-h-24 p-4 rounded-squircle-sm bg-ink-200 border border-white/[0.06] text-fog-100 outline-none focus:border-crimson-300"
          />
        </Field>
      </Squircle>

      <Squircle variant="raised" className="p-4">
        <Field label="Avoided combinations">
          <textarea
            rows={3}
            value={serializeAvoidedCombos(profile.avoided_combinations)}
            placeholder="skinny jeans with chunky sneakers | bad proportion"
            onChange={(e) => set('avoided_combinations', parseAvoidedCombos(e.target.value))}
            className="w-full min-h-24 p-4 rounded-squircle-sm bg-ink-200 border border-white/[0.06] text-fog-100 outline-none focus:border-crimson-300"
          />
        </Field>
      </Squircle>

      <Squircle variant="raised" className="p-4">
        <Field label="Style rules">
          <textarea
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

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-white/[0.05] border border-white/[0.06] px-3 py-2">
      <div className="flex items-center gap-1.5 text-[#FF86A0]">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1 text-[15px] leading-none font-semibold text-[#FFEDE8]">{value}</p>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="oneui-hero-sub text-fog-400">{label}</span>
      {children}
    </div>
  );
}
