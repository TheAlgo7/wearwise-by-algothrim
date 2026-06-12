'use client';

import { OneUIButton } from '@/components/oneui';
import { cn } from '@/lib/cn';
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

export function OutfitDetailSheet({ outfit, items, open, onClose, saved, worn, onSave, onWear }: Props) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  // Reactive reduced-motion: seed from the current match (lazy, SSR-safe), then keep in sync.
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

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

  // Focus trap — keeps keyboard navigation inside the dialog while open
  const trapRef = useFocusTrap(visible);

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const resolved = useMemo(() => outfit.items.map((id) => byId.get(id)).filter(Boolean) as Item[], [outfit.items, byId]);

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
        className="relative w-full max-w-xl flex flex-col rounded-t-[28px] overflow-hidden border border-b-0 border-white/[0.08]"
        style={{
          // One UI 9 glass: translucent floating surface, dimmed page bleeds through
          background: 'rgba(18,16,18,0.84)',
          backdropFilter: 'blur(32px) saturate(160%)',
          WebkitBackdropFilter: 'blur(32px) saturate(160%)',
          maxHeight: '92dvh',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: reducedMotion ? 'none' : 'transform 400ms var(--ease-spring)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="outfit-sheet-title"
      >
        {/* Drag handle — One UI 9 chunkier handle */}
        <div className="pt-3 pb-0 flex justify-center shrink-0">
          <div className="h-1.5 w-12 rounded-full bg-white/25" />
        </div>

        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-start justify-between shrink-0">
          <div>
            <p className="text-[11px] font-semibold text-crimson-300 tracking-widest uppercase">Today's pick</p>
            <h2 id="outfit-sheet-title" className="text-[24px] font-semibold text-crimson-50 leading-[1.15] tracking-tight mt-1">
              {resolved.length} piece outfit
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="press mt-1 h-10 w-10 rounded-full flex items-center justify-center shrink-0 bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          >
            <X size={18} className="text-fog-300" />
          </button>
        </div>

        {/* Scrollable body */}
        <div
          className="overflow-y-auto flex-1 px-4 pb-[calc(env(safe-area-inset-bottom)+24px)]"
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
                  className="rounded-[20px] overflow-hidden flex items-center justify-center bg-ink-0"
                  style={{ aspectRatio: resolved.length === 1 ? '4/3' : '1' }}
                >
                  {it.image_url ? (
                    <Image
                      src={it.image_url}
                      alt={it.name}
                      width={400}
                      height={400}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-crimson-100/30 text-[11px] text-center px-4 leading-relaxed">
                      {it.name}
                    </span>
                  )}
                </div>

                {/* Item info */}
                <div className="mt-2.5 px-0.5">
                  <p className="text-[14px] font-semibold text-crimson-50 leading-tight">{it.name}</p>
                  <p className="text-[11px] text-fog-300 mt-0.5 capitalize">
                    {[it.category?.name, it.fit].filter(Boolean).join(' · ')}
                  </p>
                  {it.material.length > 0 && (
                    <p className="text-[11px] mt-0.5 capitalize text-crimson-300/70">
                      {it.material.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Reasoning */}
          {outfit.reasoning && (
            <div className="mt-5 rounded-[16px] px-4 py-4 bg-crimson-400/[0.06] border border-crimson-400/[0.12]">
              <p className="text-[10px] font-semibold tracking-widest uppercase mb-2 text-crimson-300">
                Why this works
              </p>
              <p className="text-[13px] leading-[1.7] text-fog-200">{outfit.reasoning}</p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex gap-2">
            <OneUIButton
              intent={worn ? 'secondary' : 'primary'}
              size="md"
              onClick={() => { onWear?.(); onClose(); }}
              leftIcon={<Check size={16} />}
              className="flex-1"
            >
              {worn ? 'Worn today' : 'Wearing this'}
            </OneUIButton>
            <OneUIButton
              intent={saved ? 'secondary' : 'ghost'}
              size="md"
              onClick={onSave}
              leftIcon={saved ? <BookmarkCheck size={16} /> : <BookmarkPlus size={16} />}
            >
              {saved ? 'Saved' : 'Save'}
            </OneUIButton>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
