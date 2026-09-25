'use client';

import { OneUIButton } from '@/components/oneui';
import { cn } from '@/lib/cn';
import { colourStory } from '@/lib/colour-story';
import { BookmarkCheck, BookmarkPlus, Check, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import type { GeneratedOutfit, Item } from '@/types';

interface Props {
  outfit: GeneratedOutfit;
  items: Item[];
  open: boolean;
  onClose: () => void;
  saved?: boolean;
  worn?: boolean;
  onSave?: () => void;
  onWear?: () => void;
}

/**
 * Every piece in the outfit, large, with the full reasoning.
 *
 * The slide always runs. It used to switch itself off under
 * `prefers-reduced-motion`, and Gaurav keeps that on at the OS level, so on the
 * only phone this app lives on the sheet appeared and vanished with no motion
 * at all.
 */
export function OutfitDetailSheet({ outfit, items, open, onClose, saved, worn, onSave, onWear }: Props) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      // Mount-then-animate: this enter/exit orchestration is inherently effect-driven.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 440);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  // Focus trap: keeps keyboard navigation inside the dialog while open
  const trapRef = useFocusTrap(visible);

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const resolved = useMemo(() => outfit.items.map((id) => byId.get(id)).filter(Boolean) as Item[], [outfit.items, byId]);
  const story = useMemo(() => colourStory(resolved), [resolved]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black transition-opacity duration-300"
        style={{ opacity: visible ? 0.8 : 0 }}
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div
        ref={trapRef}
        className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-t-[28px] border border-b-0 border-white/[0.08]"
        style={{
          // One UI 9 glass: translucent floating surface, dimmed page bleeds through
          background: 'rgb(var(--ink-100) / 0.88)',
          backdropFilter: 'blur(32px) saturate(160%)',
          WebkitBackdropFilter: 'blur(32px) saturate(160%)',
          maxHeight: '92dvh',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 400ms var(--ease-spring)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="outfit-sheet-title"
      >
        {/* Drag handle, One UI 9 chunkier handle */}
        <div className="flex shrink-0 justify-center pb-0 pt-3">
          <div className="h-1.5 w-12 rounded-full bg-white/25" />
        </div>

        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-4">
          <div className="min-w-0">
            <h2 id="outfit-sheet-title" className="mt-1 text-[24px] font-semibold leading-[1.15] tracking-tight text-fog-100">
              {resolved.length} pieces
            </h2>
            {story.swatches.length > 0 && (
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-medium text-fog-300">
                {story.swatches.map((s) => (
                  <span key={s.name} className="inline-flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full ring-1 ring-inset ring-white/[0.18]" style={{ background: s.hex }} aria-hidden />
                    {s.name}
                  </span>
                ))}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="press mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          >
            <X size={18} className="text-fog-300" />
          </button>
        </div>

        {/* Scrollable body */}
        <div
          className="flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+24px)]"
          role="region"
          aria-label="Outfit details"
          tabIndex={0}
        >
          {/* Item grid */}
          <div className={cn('grid gap-3', resolved.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
            {resolved.map((it) => (
              <div key={it.id}>
                {/* Photo */}
                <div
                  className="photo-well flex items-center justify-center overflow-hidden rounded-[20px]"
                  style={{ aspectRatio: resolved.length === 1 ? '4/3' : '1' }}
                >
                  {it.image_url ? (
                    <Image
                      src={it.image_url}
                      alt={it.name}
                      width={400}
                      height={400}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="px-4 text-center text-[11px] leading-relaxed text-fog-400">
                      {it.name}
                    </span>
                  )}
                </div>

                {/* Item info */}
                <div className="mt-2.5 px-0.5">
                  <p className="text-[14px] font-semibold leading-tight text-fog-100">{it.name}</p>
                  <p className="mt-0.5 text-[12px] capitalize text-fog-300">
                    {[it.category?.name, it.fit].filter(Boolean).join(' · ')}
                  </p>
                  {it.material.length > 0 && (
                    <p className="mt-0.5 text-[12px] capitalize text-fog-400">
                      {it.material.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Reasoning */}
          {outfit.reasoning && (
            <div className="mt-5 rounded-[18px] border border-crimson-400/[0.14] bg-crimson-400/[0.06] px-4 py-4">
              <p className="mb-2 text-[13px] font-semibold text-crimson-300">
                Why this works
              </p>
              <p className="text-[14px] leading-[1.65] text-fog-200 text-pretty">{outfit.reasoning}</p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex gap-2">
            <OneUIButton
              intent={worn ? 'secondary' : 'primary'}
              size="lg"
              onClick={() => { onWear?.(); onClose(); }}
              disabled={worn}
              leftIcon={<Check size={17} />}
              className="flex-1"
            >
              {worn ? 'Worn today' : 'Wear this'}
            </OneUIButton>
            {onSave && (
              <OneUIButton
                intent="secondary"
                size="lg"
                onClick={onSave}
                leftIcon={saved ? <BookmarkCheck size={17} /> : <BookmarkPlus size={17} />}
              >
                {saved ? 'Saved' : 'Save'}
              </OneUIButton>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
