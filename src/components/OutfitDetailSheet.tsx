'use client';

import { OneUIButton } from '@/components/oneui';
import { cn } from '@/lib/cn';
import { BookmarkCheck, BookmarkPlus, Check, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (open) {
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
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const byId = new Map(items.map((i) => [i.id, i]));
  const resolved = outfit.items.map((id) => byId.get(id)).filter(Boolean) as Item[];

  if (!mounted) return null;

  return (
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
        className="relative w-full max-w-xl flex flex-col rounded-t-[28px] overflow-hidden"
        style={{
          background: '#0E0D0C',
          maxHeight: '92dvh',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 420ms cubic-bezier(0.16, 1, 0.3, 1)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)',
        }}
        role="dialog"
        aria-modal="true"
      >
        {/* Drag handle */}
        <div className="pt-3 pb-0 flex justify-center shrink-0">
          <div className="h-1 w-10 rounded-full bg-white/[0.18]" />
        </div>

        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-start justify-between shrink-0">
          <div>
            <p className="text-[11px] font-semibold text-[#FF86A0] tracking-widest uppercase">Today's pick</p>
            <h2 className="text-[24px] font-semibold text-[#FFEDE8] leading-[1.15] tracking-tight mt-1">
              {resolved.length} piece outfit
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="press mt-1 h-10 w-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,255,255,0.07)' }}
          >
            <X size={18} style={{ color: '#A89098' }} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-4">
          {/* Item grid */}
          <div className={cn('grid gap-3', resolved.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
            {resolved.map((it) => (
              <div key={it.id}>
                {/* Photo */}
                <div
                  className="rounded-[20px] overflow-hidden flex items-center justify-center"
                  style={{
                    background: '#000',
                    aspectRatio: resolved.length === 1 ? '4/3' : '1',
                  }}
                >
                  {it.image_url ? (
                    <Image
                      src={it.image_url}
                      alt={it.name}
                      width={400}
                      height={400}
                      className="w-full h-full object-contain"
                      unoptimized
                    />
                  ) : (
                    <span className="text-[#FFD9DA]/30 text-[11px] text-center px-4 leading-relaxed">
                      {it.name}
                    </span>
                  )}
                </div>

                {/* Item info */}
                <div className="mt-2.5 px-0.5">
                  <p className="text-[14px] font-semibold text-[#FFEDE8] leading-tight">{it.name}</p>
                  <p className="text-[11px] text-[#A89098] mt-0.5 capitalize">
                    {[it.category?.name, it.fit].filter(Boolean).join(' · ')}
                  </p>
                  {it.material.length > 0 && (
                    <p className="text-[11px] mt-0.5 capitalize" style={{ color: '#FF86A0', opacity: 0.7 }}>
                      {it.material.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Reasoning */}
          {outfit.reasoning && (
            <div
              className="mt-5 rounded-[16px] px-4 py-3.5"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <p className="text-[13px] leading-[1.65] text-[#D9C8CC]">{outfit.reasoning}</p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 mb-2 flex gap-2">
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
    </div>
  );
}
