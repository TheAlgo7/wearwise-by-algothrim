'use client';

import { OneUIButton, OneUIChip, Squircle } from '@/components/oneui';
import { FITS, OCCASIONS, SLEEVES, VIBES } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import type { Category, Item } from '@/types';
import { Camera, ChevronDown, Loader2, Sparkles, Upload, Check, Image as ImageIcon } from 'lucide-react';
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
  /** Whether the full attribute form is expanded on the confirm step. */
  const [detailed, setDetailed] = useState(false);
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
      const insertRes = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(row),
      });
      if (!insertRes.ok) {
        const body = await insertRes.json().catch(() => ({}));
        throw new Error(body.error ?? `Save failed (HTTP ${insertRes.status})`);
      }
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
          <div className="h-20 w-20 rounded-full bg-crimson-400 flex items-center justify-center shadow-crimson-glow">
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
        {error && <div className="text-center text-[13px] text-error-text">{error}</div>}
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
            <div className="h-14 w-14 rounded-full bg-crimson-400 flex items-center justify-center">
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

  // ── Confirm ──
  // The AI has already answered every question on this screen. Showing all
  // fourteen answers as editable fields turned a two-tap confirmation into a
  // form, so the default is now the one question that matters — does this look
  // right — and everything else waits behind "Review details". The exceptions
  // are fields the model actually left blank: those are asked for up front,
  // because a nameless or uncategorised piece is a piece the engine cannot use.
  const categoryName = categories.find((c) => c.id === category)?.name ?? null;
  const blanks: Array<'name' | 'category'> = [];
  if (!(tags.name ?? '').trim()) blanks.push('name');
  if (!category) blanks.push('category');

  const summary = [categoryName, tags.primary_color, tags.fit ? `${tags.fit} fit` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="flex flex-col gap-3">
      {preview && (
        <Squircle variant="flat" className="aspect-square flex items-center justify-center overflow-hidden">
          <Image src={preview} alt={tags.name ?? 'Cleaned photo of the item'} width={500} height={500} className="object-contain w-full h-full" unoptimized />
        </Squircle>
      )}

      <div className="px-1">
        <h2 className="text-oneui-h text-fog-100">Looks right?</h2>
        {blanks.length === 0 ? (
          <>
            <p className="mt-2 text-[17px] font-semibold leading-6 text-fog-100">{tags.name}</p>
            {summary && <p className="mt-0.5 text-[13px] text-fog-400">{summary}</p>}
          </>
        ) : (
          <p className="mt-1 text-[13px] leading-5 text-fog-400">
            {blanks.length === 2
              ? 'The photo came back without a name or a category. Fill those in and it is ready.'
              : blanks[0] === 'name'
              ? 'It could not name this one. Give it a name and it is ready.'
              : 'It could not place this on a shelf. Pick a category and it is ready.'}
          </p>
        )}
      </div>

      {blanks.includes('name') && (
        <Field label="Name" htmlFor="item-name">
          <input
            id="item-name"
            value={tags.name ?? ''}
            onChange={(e) => setTags({ ...tags, name: e.target.value })}
            autoFocus
            className="w-full h-12 px-4 rounded-squircle-sm bg-ink-200 border border-white/[0.06] text-fog-100 outline-none focus:border-crimson-400"
          />
        </Field>
      )}

      {blanks.includes('category') && (
        <Field label="Category" htmlFor="item-category">
          <select
            id="item-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full h-12 px-4 rounded-squircle-sm bg-ink-200 border border-white/[0.06] text-fog-100 outline-none focus:border-crimson-400"
          >
            <option value="">Pick a shelf</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
      )}

      {error && <p className="px-1 text-[13px] text-error-text">{error}</p>}

      <OneUIButton size="lg" fullWidth leftIcon={<Upload size={18} />} onClick={save}>
        Add to wardrobe
      </OneUIButton>

      <button
        type="button"
        onClick={() => setDetailed((v) => !v)}
        aria-expanded={detailed}
        className="press mx-auto flex min-h-[48px] items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold text-fog-300 transition-colors hover:text-fog-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
      >
        {detailed ? 'Hide details' : 'Review details'}
        <ChevronDown
          size={16}
          aria-hidden
          className="transition-transform duration-200"
          style={{ transform: detailed ? 'rotate(180deg)' : undefined }}
        />
      </button>

      {!detailed ? (
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
            setDetailed(false);
          }}
        >
          Start over with a different photo
        </OneUIButton>
      ) : (
      <div className="animate-oneui-fade flex flex-col gap-3">
      {!blanks.includes('name') && (
        <Field label="Name" htmlFor="item-name-full">
          <input
            id="item-name-full"
            value={tags.name ?? ''}
            onChange={(e) => setTags({ ...tags, name: e.target.value })}
            className="w-full h-12 px-4 rounded-squircle-sm bg-ink-200 border border-white/[0.06] text-fog-100 outline-none focus:border-crimson-400"
          />
        </Field>
      )}

      {!blanks.includes('category') && (
        <Field label="Category" htmlFor="item-category-full">
          <select
            id="item-category-full"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full h-12 px-4 rounded-squircle-sm bg-ink-200 border border-white/[0.06] text-fog-100 outline-none focus:border-crimson-400"
          >
            <option value="">Pick a shelf</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
      )}

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

      <Field label="Can be worn open (button-downs)" htmlFor="item-worn-open">
        <label className="flex items-center gap-3 h-12 px-4 rounded-squircle-sm bg-ink-200 border border-white/[0.06]">
          <input
            id="item-worn-open"
            type="checkbox"
            checked={!!tags.can_be_worn_open}
            onChange={(e) => setTags({ ...tags, can_be_worn_open: e.target.checked })}
            className="accent-crimson-400 h-4 w-4"
          />
          <span className="text-oneui-body text-fog-200">Wear unbuttoned over a tee</span>
        </label>
      </Field>

      <Field label={`Formality (1 gym · 5 black-tie): ${tags.formality ?? 3}`} htmlFor="item-formality">
        <input
          id="item-formality"
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
            id="item-temp-min"
            aria-label="Minimum temperature °C"
            type="number"
            placeholder="min °C"
            value={tags.min_temp_c ?? ''}
            onChange={(e) => setTags({ ...tags, min_temp_c: e.target.value === '' ? null : Number(e.target.value) })}
            className="h-12 px-4 rounded-squircle-sm bg-ink-200 border border-white/[0.06] text-fog-100 outline-none focus:border-crimson-300"
          />
          <input
            id="item-temp-max"
            aria-label="Maximum temperature °C"
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
          setDetailed(false);
        }}
      >
        Start over with a different photo
      </OneUIButton>
      </div>
      )}
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="px-1 text-[13px] font-semibold text-fog-300">{label}</label>
      {children}
    </div>
  );
}
