'use client';

import { OneUIButton } from '@/components/oneui';
import { OutfitDetailSheet } from '@/components/OutfitDetailSheet';
import { cn } from '@/lib/cn';
import { Check, BookmarkPlus, BookmarkCheck, Star, Shirt } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import type { Item, GeneratedOutfit } from '@/types';

interface Props {
  outfit: GeneratedOutfit;
  items: Item[];
  saved?: boolean;
  worn?: boolean;
  rating?: number;
  onSave?: () => void;
  onWear?: () => void;
  onRate?: (n: number) => void;
  className?: string;
}

export function OutfitCard({ outfit, items, saved, worn, rating, onSave, onWear, onRate, className }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const byId = new Map(items.map((i) => [i.id, i]));
  const resolved = Array.from(
    new Map(outfit.items.map((id) => byId.get(id)).filter(Boolean).map((i) => [i!.id, i!])).values()
  );

  return (
    <>
      <div className={cn('glass-card animate-oneui-fade', className)}>
        {/* Tappable preview area → opens detail sheet */}
        <button
          className="press w-full text-left p-5 pb-3"
          onClick={() => setSheetOpen(true)}
          aria-label="View outfit details"
        >
          {/* Item strip — scrollable */}
          <div className="flex gap-2.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {resolved.map((it) => (
              <div
                key={it.id}
                className="shrink-0 w-[88px] h-[88px] rounded-[1.25rem] overflow-hidden flex items-center justify-center"
                style={{
                  background: '#000',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                {it.image_url ? (
                  <Image
                    src={it.image_url}
                    alt={it.name}
                    width={88}
                    height={88}
                    className="w-full h-full object-contain"
                    unoptimized
                  />
                ) : (
                  <Shirt size={28} className="text-[#FFD9DA]/30" strokeWidth={1.4} />
                )}
              </div>
            ))}
          </div>

          {/* Name pills */}
          <div className="mt-3 flex gap-2 overflow-x-hidden flex-wrap">
            {resolved.map((it) => (
              <span
                key={it.id}
                className="shrink-0 text-oneui-cap text-[#FF86A0] bg-[#E2335D]/10 rounded-full px-2.5 py-0.5"
              >
                {it.name}
              </span>
            ))}
          </div>

          {/* Reasoning — clamped, tap to see full */}
          <p className="mt-3 text-[13px] leading-[1.6] text-[#FFD9DA]/70 text-pretty line-clamp-3">{outfit.reasoning}</p>

          <p className="mt-1.5 text-[11px] text-[#FF86A0]/50 font-medium">Tap to view full outfit →</p>
        </button>

        {/* Actions — stopPropagation so they don't open the sheet */}
        <div className="px-5 pb-5 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <OneUIButton
            intent={worn ? 'secondary' : 'primary'}
            size="sm"
            onClick={onWear}
            leftIcon={<Check size={15} />}
            className="flex-1"
          >
            {worn ? 'Worn today' : 'Wearing this'}
          </OneUIButton>
          <OneUIButton
            intent={saved ? 'secondary' : 'ghost'}
            size="sm"
            onClick={onSave}
            leftIcon={saved ? <BookmarkCheck size={15} /> : <BookmarkPlus size={15} />}
          >
            {saved ? 'Saved' : 'Save'}
          </OneUIButton>
        </div>

        {/* Rating */}
        {onRate && (
          <div className="pb-4 flex items-center gap-1.5 justify-center" onClick={(e) => e.stopPropagation()}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => onRate(n)} aria-label={`Rate ${n}`} className="press p-1">
                <Star
                  size={18}
                  className={n <= (rating ?? 0) ? '' : 'text-white/20'}
                  style={n <= (rating ?? 0) ? { color: '#E2335D', fill: '#E2335D' } : {}}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <OutfitDetailSheet
        outfit={outfit}
        items={items}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        saved={saved}
        worn={worn}
        onSave={onSave}
        onWear={() => { onWear?.(); setSheetOpen(false); }}
      />
    </>
  );
}
