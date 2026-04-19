'use client';

import { OneUIButton, OneUIChip, Squircle } from '@/components/oneui';
import { FITS, OCCASIONS, SLEEVES, VIBES } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import type { Category, Item } from '@/types';
import { Camera, Loader2, Sparkles, Upload, Check, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

interface TagResult {
  name: string;
  category_hint: string;
  primary_color: string;
  secondary_colors: string[];
  fit: string | null;
  sleeve_length: string | null;
  can_be_worn_open: boolean;
  material: string[];
  formality: number;
  vibe: string[];
  min_temp_c: number | null;
  max_temp_c: number | null;
  occasions: string[];
  notes: string;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const data = r.result as string;
      resolve(data.split(',')[1] ?? '');
    };
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

function base64ToPreview(b64: string, mime: string): string {
  return `data:${mime};base64,${b64}`;
}

type Step = 'photo' | 'cleaning' | 'tagging' | 'confirm' | 'saving' | 'done';

export function AddItemForm() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [step, setStep] = useState<Step>('photo');
  const [rawB64, setRawB64] = useState<string | null>(null);
  const [rawMime, setRawMime] = useState<string>('image/jpeg');
  const [cleanedB64, setCleanedB64] = useState<string | null>(null);
  const [cleanedMime, setCleanedMime] = useState<string>('image/png');
  const [tags, setTags] = useState<Partial<TagResult>>({});
  const [category, setCategory] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supa = createClient();
    (async () => {
      const { data } = await supa.from('categories').select('*').order('sort_order');
      setCategories((data ?? []) as Category[]);
    })();
  }, []);

  const onFile = async (file: File) => {
    setError(null);
    const b64 = await blobToBase64(file);
    setRawB64(b64);
    setRawMime(file.type || 'image/jpeg');
    setStep('cleaning');

    try {
      const cleanRes = await fetch('/api/clean-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: b64, mime_type: file.type || 'image/jpeg' }),
      });
      const clean = await cleanRes.json();
      if (!cleanRes.ok) {
        // Fall back to raw image if clean fails
        setCleanedB64(b64);
        setCleanedMime(file.type || 'image/jpeg');
      } else {
        setCleanedB64(clean.image_base64);
        setCleanedMime(clean.mime_type);
      }
      setStep('tagging');

      const tagRes = await fetch('/api/tag-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: (clean?.image_base64 ?? b64),
          mime_type: (clean?.mime_type ?? file.type ?? 'image/jpeg'),
        }),
      });
      const tagJson = await tagRes.json();
      if (!tagRes.ok) {
        setError(tagJson.error ?? 'AI tagging failed — fill in manually below');
        setTags({});
      } else {
        setTags(tagJson);
        // Best-guess category match
        const match = categories.find((c) => c.name.toLowerCase() === (tagJson.category_hint ?? '').toLowerCase());
        if (match) setCategory(match.id);
      }
      setStep('confirm');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStep('photo');
    }
  };

  const togglein = (key: keyof TagResult) => (v: string) => {
    setTags((prev) => {
      const arr = (prev[key] as string[] | undefined) ?? [];
      const next = arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
      return { ...prev, [key]: next };
    });
  };

  const save = async () => {
    if (!cleanedB64 || !category) {
      setError('Pick a category and keep the photo.');
      return;
    }
    setStep('saving');
    setError(null);
    try {
      const upRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: cleanedB64,
          mime_type: cleanedMime,
          filename_hint: tags.name ?? 'item',
        }),
      });
      const up = await upRes.json();
      if (!upRes.ok) throw new Error(up.error ?? 'Upload failed');

      const supa = createClient();
      const row: Partial<Item> = {
        name: tags.name ?? 'Unnamed item',
        category_id: category,
        image_url: up.public_url,
        image_path: up.path,
        primary_color: tags.primary_color ?? null,
        secondary_colors: tags.secondary_colors ?? [],
        fit: (tags.fit ?? null) as Item['fit'],
        sleeve_length: (tags.sleeve_length ?? null) as Item['sleeve_length'],
        can_be_worn_open: tags.can_be_worn_open ?? false,
        material: tags.material ?? [],
        formality: tags.formality ?? 3,
        vibe: tags.vibe ?? [],
        min_temp_c: tags.min_temp_c ?? null,
        max_temp_c: tags.max_temp_c ?? null,
        occasions: tags.occasions ?? [],
        notes: tags.notes ?? null,
      };
      const { error: insertErr } = await supa.from('items').insert(row);
      if (insertErr) throw new Error(insertErr.message);
      setStep('done');
      setTimeout(() => router.push('/wardrobe'), 600);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStep('confirm');
    }
  };

  const preview = cleanedB64
    ? base64ToPreview(cleanedB64, cleanedMime)
    : rawB64
    ? base64ToPreview(rawB64, rawMime)
    : null;

  if (step === 'photo') {
    return (
      <div className="flex flex-col gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
        <Squircle variant="raised" className="p-6 flex flex-col items-center gap-4 text-center">
          <div className="h-20 w-20 rounded-full bg-crimson-gradient flex items-center justify-center shadow-crimson-glow">
            <Camera size={32} strokeWidth={1.6} className="text-white" />
          </div>
          <h3 className="text-oneui-h text-fog-100">Snap a clothing item</h3>
          <p className="text-oneui-body text-fog-300 text-pretty max-w-sm">
            Photograph the piece against any background. WearWise will clean the image,
            remove the background, and auto-tag it. You confirm with one tap.
          </p>
          <div className="flex flex-col gap-2 w-full">
            <OneUIButton
              fullWidth
              leftIcon={<Camera size={18} />}
              onClick={() => fileRef.current?.click()}
            >
              Take photo
            </OneUIButton>
            <OneUIButton
              fullWidth
              intent="secondary"
              leftIcon={<ImageIcon size={18} />}
              onClick={() => {
                if (fileRef.current) fileRef.current.removeAttribute('capture');
                fileRef.current?.click();
              }}
            >
              Choose from gallery
            </OneUIButton>
          </div>
        </Squircle>
        {error && <div className="text-oneui-cap text-crimson-300 text-center">{error}</div>}
      </div>
    );
  }

  if (step === 'cleaning' || step === 'tagging') {
    return (
      <div className="flex flex-col gap-3">
        {preview && (
          <Squircle variant="flat" className="aspect-square flex items-center justify-center overflow-hidden">
            <Image src={preview} alt="preview" width={400} height={400} className="object-contain w-full h-full opacity-60" unoptimized />
          </Squircle>
        )}
        <Squircle variant="raised" className="p-4 flex items-center gap-3">
          <Loader2 className="animate-spin text-crimson-300" size={20} />
          <span className="text-oneui-body text-fog-200">
            {step === 'cleaning' ? 'Removing background…' : 'Reading the garment…'}
          </span>
        </Squircle>
      </div>
    );
  }

  if (step === 'saving' || step === 'done') {
    return (
      <Squircle variant="raised" className="p-10 flex flex-col items-center gap-3">
        {step === 'done' ? (
          <>
            <div className="h-14 w-14 rounded-full bg-crimson-gradient flex items-center justify-center">
              <Check size={28} className="text-white" strokeWidth={2.8} />
            </div>
            <p className="text-oneui-body text-fog-100">Added to wardrobe</p>
          </>
        ) : (
          <>
            <Loader2 className="animate-spin text-crimson-300" size={28} />
            <p className="text-oneui-body text-fog-200">Saving…</p>
          </>
        )}
      </Squircle>
    );
  }

  // confirm step
  return (
    <div className="flex flex-col gap-3">
      {preview && (
        <Squircle variant="flat" className="aspect-square flex items-center justify-center overflow-hidden">
          <Image src={preview} alt="cleaned" width={500} height={500} className="object-contain w-full h-full" unoptimized />
        </Squircle>
      )}

      <Field label="Name">
        <input
          value={tags.name ?? ''}
          onChange={(e) => setTags({ ...tags, name: e.target.value })}
          className="w-full h-12 px-4 rounded-squircle-sm bg-ink-200 border border-white/[0.06] text-fog-100 outline-none focus:border-crimson-300"
        />
      </Field>

      <Field label="Category">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full h-12 px-4 rounded-squircle-sm bg-ink-200 border border-white/[0.06] text-fog-100 outline-none focus:border-crimson-300"
        >
          <option value="">— pick —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>

      <Field label="Fit">
        <div className="chip-row !mx-0 !px-0">
          {FITS.map((f) => (
            <OneUIChip
              key={f}
              active={tags.fit === f}
              onClick={() => setTags({ ...tags, fit: tags.fit === f ? null : f })}
            >
              {f}
            </OneUIChip>
          ))}
        </div>
      </Field>

      <Field label="Sleeve">
        <div className="chip-row !mx-0 !px-0">
          {SLEEVES.map((s) => (
            <OneUIChip
              key={s}
              active={tags.sleeve_length === s}
              onClick={() => setTags({ ...tags, sleeve_length: tags.sleeve_length === s ? null : s })}
            >
              {s}
            </OneUIChip>
          ))}
        </div>
      </Field>

      <Field label={`Can be worn open (button-downs)`}>
        <label className="flex items-center gap-3 h-12 px-4 rounded-squircle-sm bg-ink-200 border border-white/[0.06]">
          <input
            type="checkbox"
            checked={!!tags.can_be_worn_open}
            onChange={(e) => setTags({ ...tags, can_be_worn_open: e.target.checked })}
            className="accent-crimson-400 h-4 w-4"
          />
          <span className="text-oneui-body text-fog-200">Wear unbuttoned over a tee</span>
        </label>
      </Field>

      <Field label={`Formality (1 gym · 5 black-tie): ${tags.formality ?? 3}`}>
        <input
          type="range"
          min={1}
          max={5}
          value={tags.formality ?? 3}
          onChange={(e) => setTags({ ...tags, formality: parseInt(e.target.value) })}
          className="w-full accent-crimson-400"
        />
      </Field>

      <Field label={`Temperature range: ${tags.min_temp_c ?? '–'}°C to ${tags.max_temp_c ?? '–'}°C`}>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="min °C"
            value={tags.min_temp_c ?? ''}
            onChange={(e) => setTags({ ...tags, min_temp_c: e.target.value === '' ? null : Number(e.target.value) })}
            className="h-12 px-4 rounded-squircle-sm bg-ink-200 border border-white/[0.06] text-fog-100 outline-none focus:border-crimson-300"
          />
          <input
            type="number"
            placeholder="max °C"
            value={tags.max_temp_c ?? ''}
            onChange={(e) => setTags({ ...tags, max_temp_c: e.target.value === '' ? null : Number(e.target.value) })}
            className="h-12 px-4 rounded-squircle-sm bg-ink-200 border border-white/[0.06] text-fog-100 outline-none focus:border-crimson-300"
          />
        </div>
      </Field>

      <Field label="Vibe">
        <div className="flex flex-wrap gap-2">
          {VIBES.map((v) => (
            <OneUIChip
              key={v}
              active={(tags.vibe ?? []).includes(v)}
              onClick={() => togglein('vibe')(v)}
            >
              {v}
            </OneUIChip>
          ))}
        </div>
      </Field>

      <Field label="Occasions">
        <div className="flex flex-wrap gap-2">
          {OCCASIONS.map((o) => (
            <OneUIChip
              key={o}
              active={(tags.occasions ?? []).includes(o)}
              onClick={() => togglein('occasions')(o)}
            >
              {o}
            </OneUIChip>
          ))}
        </div>
      </Field>

      {error && <p className="text-oneui-cap text-crimson-300">{error}</p>}

      <OneUIButton
        size="lg"
        fullWidth
        leftIcon={<Upload size={18} />}
        onClick={save}
      >
        Save to wardrobe
      </OneUIButton>

      <OneUIButton
        intent="ghost"
        size="sm"
        fullWidth
        leftIcon={<Sparkles size={14} />}
        onClick={() => {
          setStep('photo');
          setRawB64(null);
          setCleanedB64(null);
          setTags({});
          setCategory('');
        }}
      >
        Start over with a different photo
      </OneUIButton>
    </div>
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
