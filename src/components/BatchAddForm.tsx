'use client';

import { OneUIButton, Squircle } from '@/components/oneui';
import { cn } from '@/lib/cn';
import { createClient } from '@/lib/supabase/client';
import type { Category, Item } from '@/types';
import { AlertCircle, Check, Images, Loader2, RotateCcw, Trash2, Upload } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Add several pieces in one pass.
 *
 * The single-item flow is four steps per garment, which is fine for one and
 * miserable for fifteen. This runs clean + tag concurrently across the whole
 * batch, then asks for one confirmation sweep: check the name, check the
 * category, save everything.
 *
 * Concurrency is capped because both AI endpoints are rate-limited and a
 * fifteen-way parallel burst reliably trips them.
 */

const CONCURRENCY = 3;
const MAX_FILES = 20;

interface Draft {
  key: string;
  fileName: string;
  status: 'queued' | 'processing' | 'ready' | 'failed' | 'saving' | 'saved';
  previewB64: string | null;
  mime: string;
  name: string;
  categoryId: string;
  categoryHint: string;
  tags: Record<string, unknown>;
  error?: string;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve((r.result as string).split(',')[1] ?? '');
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export function BatchAddForm() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const categoriesRef = useRef<Category[]>([]);

  useEffect(() => {
    const supa = createClient();
    (async () => {
      const { data } = await supa.from('categories').select('*').order('sort_order');
      const list = (data ?? []) as Category[];
      categoriesRef.current = list;
      setCategories(list);
    })();
  }, []);

  const patch = useCallback((key: string, next: Partial<Draft>) => {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...next } : d)));
  }, []);

  /** Clean the background, then read the garment. One garment, both calls. */
  const process = useCallback(
    async (key: string, rawB64: string, mime: string) => {
      patch(key, { status: 'processing' });
      try {
        let cleanB64 = rawB64;
        let cleanMime = mime;
        const cleanRes = await fetch('/api/clean-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_base64: rawB64, mime_type: mime }),
        });
        if (cleanRes.ok) {
          const clean = await cleanRes.json();
          cleanB64 = clean.image_base64;
          cleanMime = clean.mime_type;
        }

        const tagRes = await fetch('/api/tag-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_base64: cleanB64, mime_type: cleanMime }),
        });

        if (!tagRes.ok) {
          const body = await tagRes.json().catch(() => ({}));
          patch(key, {
            status: 'ready',
            previewB64: cleanB64,
            mime: cleanMime,
            error: body.error ?? 'AI tagging failed. Name it yourself.',
          });
          return;
        }

        const tags = await tagRes.json();
        const hint = String(tags.category_hint ?? '');
        const match = categoriesRef.current.find((c) => c.name.toLowerCase() === hint.toLowerCase());
        patch(key, {
          status: 'ready',
          previewB64: cleanB64,
          mime: cleanMime,
          name: tags.name ?? '',
          categoryHint: hint,
          categoryId: match?.id ?? '',
          tags,
          error: undefined,
        });
      } catch (e) {
        patch(key, { status: 'failed', error: e instanceof Error ? e.message : String(e) });
      }
    },
    [patch]
  );

  const onFiles = useCallback(
    async (files: FileList) => {
      const picked = Array.from(files).slice(0, MAX_FILES);
      const seeded: Draft[] = [];
      const jobs: Array<{ key: string; b64: string; mime: string }> = [];

      for (const file of picked) {
        const key = `${file.name}-${file.size}-${crypto.randomUUID()}`;
        const b64 = await blobToBase64(file);
        const mime = file.type || 'image/jpeg';
        seeded.push({
          key,
          fileName: file.name,
          status: 'queued',
          previewB64: b64,
          mime,
          name: '',
          categoryId: '',
          categoryHint: '',
          tags: {},
        });
        jobs.push({ key, b64, mime });
      }

      setDrafts((prev) => [...prev, ...seeded]);
      setSummary(null);

      // Bounded worker pool rather than Promise.all over everything.
      let cursor = 0;
      const worker = async () => {
        while (cursor < jobs.length) {
          const job = jobs[cursor++];
          await process(job.key, job.b64, job.mime);
        }
      };
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker));
    },
    [process]
  );

  const saveAll = useCallback(async () => {
    const ready = drafts.filter((d) => d.status === 'ready' && d.categoryId && d.name.trim());
    if (ready.length === 0) return;

    setSaving(true);
    setSummary(null);
    let saved = 0;
    const failures: string[] = [];

    for (const draft of ready) {
      patch(draft.key, { status: 'saving' });
      try {
        const upRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_base64: draft.previewB64,
            mime_type: draft.mime,
            filename_hint: draft.name || 'item',
          }),
        });
        const up = await upRes.json();
        if (!upRes.ok) throw new Error(up.error ?? 'Upload failed');

        const t = draft.tags as Record<string, never>;
        const row: Partial<Item> = {
          name: draft.name.trim(),
          category_id: draft.categoryId,
          image_url: up.public_url,
          image_path: up.path,
          primary_color: (t.primary_color as string) ?? null,
          secondary_colors: (t.secondary_colors as string[]) ?? [],
          fit: (t.fit ?? null) as Item['fit'],
          sleeve_length: (t.sleeve_length ?? null) as Item['sleeve_length'],
          can_be_worn_open: Boolean(t.can_be_worn_open),
          material: (t.material as string[]) ?? [],
          formality: (t.formality as number) ?? 3,
          vibe: (t.vibe as string[]) ?? [],
          min_temp_c: (t.min_temp_c as number) ?? null,
          max_temp_c: (t.max_temp_c as number) ?? null,
          occasions: (t.occasions as string[]) ?? [],
          notes: (t.notes as string) ?? null,
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
        patch(draft.key, { status: 'saved' });
        saved += 1;
      } catch (e) {
        patch(draft.key, { status: 'ready', error: e instanceof Error ? e.message : String(e) });
        failures.push(draft.name || draft.fileName);
      }
    }

    setSaving(false);
    if (failures.length === 0) {
      setSummary(`${saved} ${saved === 1 ? 'piece' : 'pieces'} added.`);
      setTimeout(() => router.push('/wardrobe'), 900);
    } else {
      // Honest partial result: say exactly what did not make it.
      setSummary(`${saved} saved, ${failures.length} failed: ${failures.join(', ')}. Fix and save again.`);
    }
  }, [drafts, patch, router]);

  const readyCount = drafts.filter((d) => d.status === 'ready' && d.categoryId && d.name.trim()).length;
  const needsAttention = drafts.filter((d) => d.status === 'ready' && (!d.categoryId || !d.name.trim())).length;
  const working = drafts.some((d) => d.status === 'processing' || d.status === 'queued');

  if (drafts.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && onFiles(e.target.files)}
        />
        <Squircle variant="raised" className="flex flex-col items-center gap-4 p-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-crimson-400 shadow-crimson-glow">
            <Images size={32} strokeWidth={1.6} className="text-white" aria-hidden />
          </div>
          <h3 className="text-oneui-h text-fog-100">Add several at once</h3>
          <p className="max-w-sm text-oneui-body text-fog-300 text-pretty">
            Pick up to {MAX_FILES} photos. Each one gets its background removed and its
            details read automatically. You check the names and save the lot.
          </p>
          <OneUIButton fullWidth leftIcon={<Images size={18} />} onClick={() => fileRef.current?.click()}>
            Choose photos
          </OneUIButton>
        </Squircle>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && onFiles(e.target.files)}
      />

      <div className="flex items-center justify-between px-1">
        <p className="text-oneui-body text-fog-200">
          {working
            ? `Reading ${drafts.filter((d) => d.status === 'processing' || d.status === 'queued').length} of ${drafts.length}`
            : `${drafts.length} ${drafts.length === 1 ? 'photo' : 'photos'}`}
        </p>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={saving}
          className="press min-h-9 rounded-full px-3 text-[13px] font-semibold text-crimson-200 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
        >
          Add more
        </button>
      </div>

      {drafts.map((draft) => (
        <Squircle key={draft.key} variant="flat" className="p-3">
          <div className="flex gap-3">
            <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-squircle-sm bg-ink-0">
              {draft.previewB64 ? (
                <Image
                  src={`data:${draft.mime};base64,${draft.previewB64}`}
                  alt={draft.name || draft.fileName}
                  fill
                  className={cn('object-contain', draft.status === 'processing' && 'opacity-50')}
                  unoptimized
                />
              ) : null}
              {(draft.status === 'processing' || draft.status === 'queued') && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 size={20} className="animate-spin text-crimson-300" aria-hidden />
                </div>
              )}
              {draft.status === 'saved' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <Check size={22} strokeWidth={3} className="text-crimson-300" aria-hidden />
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              {draft.status === 'queued' || draft.status === 'processing' ? (
                <p className="text-oneui-body text-fog-400">
                  {draft.status === 'queued' ? 'Waiting' : 'Removing background and reading it'}
                </p>
              ) : draft.status === 'failed' ? (
                <div className="flex items-start gap-2">
                  <AlertCircle size={15} className="mt-0.5 shrink-0 text-error-text" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[13px] text-error-text">{draft.error ?? 'Could not read this photo.'}</p>
                    <button
                      type="button"
                      onClick={() => draft.previewB64 && process(draft.key, draft.previewB64, draft.mime)}
                      className="press mt-1 inline-flex min-h-9 items-center gap-1.5 rounded-full text-[13px] font-semibold text-crimson-200"
                    >
                      <RotateCcw size={13} aria-hidden /> Try again
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <input
                    value={draft.name}
                    onChange={(e) => patch(draft.key, { name: e.target.value })}
                    placeholder="Name this piece"
                    aria-label={`Name for ${draft.fileName}`}
                    disabled={draft.status !== 'ready'}
                    className="h-11 rounded-squircle-sm border border-white/[0.06] bg-ink-200 px-3 text-[15px] text-fog-100 outline-none focus:border-crimson-300 disabled:opacity-60"
                  />
                  <select
                    value={draft.categoryId}
                    onChange={(e) => patch(draft.key, { categoryId: e.target.value })}
                    aria-label={`Category for ${draft.fileName}`}
                    disabled={draft.status !== 'ready'}
                    className={cn(
                      'h-11 rounded-squircle-sm border bg-ink-200 px-3 text-[15px] text-fog-100 outline-none focus:border-crimson-300 disabled:opacity-60',
                      draft.categoryId ? 'border-white/[0.06]' : 'border-crimson-400/40'
                    )}
                  >
                    <option value="">
                      {draft.categoryHint ? `Pick a category (guessed: ${draft.categoryHint})` : 'Pick a category'}
                    </option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {draft.error && <p className="text-[12px] text-error-text">{draft.error}</p>}
                </>
              )}
            </div>

            {draft.status !== 'saved' && !saving && (
              <button
                type="button"
                onClick={() => setDrafts((prev) => prev.filter((d) => d.key !== draft.key))}
                aria-label={`Remove ${draft.name || draft.fileName}`}
                className="press -mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center self-start rounded-full text-fog-400 hover:text-error-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
              >
                <Trash2 size={15} aria-hidden />
              </button>
            )}
          </div>
        </Squircle>
      ))}

      {needsAttention > 0 && !working && (
        <p className="px-1 text-[13px] text-crimson-300">
          {needsAttention} {needsAttention === 1 ? 'piece needs' : 'pieces need'} a name and category before saving.
        </p>
      )}

      {summary && (
        <p role="status" className="px-1 text-oneui-body text-fog-200">{summary}</p>
      )}

      <OneUIButton
        size="lg"
        fullWidth
        leftIcon={saving ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
        onClick={saveAll}
        disabled={saving || working || readyCount === 0}
      >
        {saving ? 'Saving' : readyCount === 0 ? 'Nothing ready yet' : `Save ${readyCount} to wardrobe`}
      </OneUIButton>
    </div>
  );
}
