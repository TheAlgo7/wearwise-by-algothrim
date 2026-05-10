'use client';

import { OneUIButton } from '@/components/oneui';
import { OutfitDetailSheet } from '@/components/OutfitDetailSheet';
import { cn } from '@/lib/cn';
import { Check, BookmarkPlus, BookmarkCheck, Star, Shirt } from 'lucide-react';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import type { Item, GeneratedOutfit } from '@/types';

const LAYER_ORDER: Record<string, number> = {
  base: 0, mid: 1, outer: 2, bottom: 3, footwear: 4,
  timepiece: 5, accessory: 6, eyewear: 7, headwear: 8, jewelry: 9,
};

interface Props {
  outfit: GeneratedOutfit;
  items: Item[];
  itemById?: Map<string, Item>; // pre-built by parent — avoids rebuilding on every render
  saved?: boolean;
  worn?: boolean;
  rating?: number;
  onSave?: () => void;
  onWear?: () => void;
  onRate?: (n: number) => void;
  className?: string;
}

export function OutfitCard({ outfit, items, itemById: externalMap, saved, worn, rating, onSave, onWear, onRate, className }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);

  // Use pre-built map from parent when available; fall back to local construction
  const byId = useMemo(
    () => externalMap ?? new Map(items.map((i) => [i.id, i])),
    [externalMap, items]
  );

  const resolved = useMemo(() =>
    Array.from(
      new Map(outfit.items.map((id) => byId.get(id)).filter(Boolean).map((i) => [i!.id, i!])).values()
    ).sort((a, b) => (LAYER_ORDER[a.category?.layer_type ?? ''] ?? 99) - (LAYER_ORDER[b.category?.layer_type ?? ''] ?? 99)),
    [outfit.items, byId]
  );

  return (
    <>
      <div className={cn('glass-card animate-oneui-fade', className)}>
        {/* Tappable preview area opens detail sheet */}
        <button
          className="press w-full text-left p-5 pb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400 focus-visible:ring-inset"
          onClick={() => setSheetOpen(true)}
          aria-label="View outfit details"
        >
          {/* Item strip — scrollable */}
          <div className="flex gap-2.5 overflow-x-auto pb-0.5 no-scrollbar">
            {resolved.map((it) => (
              <div
                key={it.id}
                className="shrink-0 w-[88px] h-[88px] rounded-[1.25rem] overflow-hidden flex items-center justify-center bg-ink-0 border border-white/[0.1]"
              >
                {it.image_url ? (
                  <Image
                    src={it.image_url}
                    alt={it.name}
                    width={88}
                    height={88}
                    className="w-full h-full object-contain"
                    sizes="88px"
                  />
                ) : (
                  <Shirt size={28} className="text-crimson-100/30" strokeWidth={1.4} />
                )}
              </div>
            ))}
          </div>

          {/* Name pills */}
          <div className="mt-3 flex gap-2 overflow-x-hidden flex-wrap">
            {resolved.map((it) => (
              <span
                key={it.id}
                className="shrink-0 text-oneui-cap text-crimson-300 bg-crimson-400/10 rounded-full px-2.5 py-0.5"
              >
                {it.name}
              </span>
            ))}
          </div>

          {/* Reasoning — clamped, tap to see full */}
          <p className="mt-3 text-[13px] leading-[1.6] text-crimson-100/70 text-pretty line-clamp-3">{outfit.reasoning}</p>

          <p className="mt-1.5 text-[11px] text-crimson-300/50 font-medium">Tap to view full outfit →</p>
        </button>

        {/* Actions */}
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

        {/* Rating — p-3.5 = 46px touch target (WCAG minimum) */}
        {onRate && (
          <div className="pb-4 flex items-center gap-0.5 justify-center" onClick={(e) => e.stopPropagation()}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => onRate(n)}
                aria-label={`Rate ${n} star${n !== 1 ? 's' : ''}`}
                aria-pressed={n <= (rating ?? 0)}
                className="press p-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400 rounded-full"
              >
                <Star
                  size={18}
                  className={n <= (rating ?? 0) ? 'text-crimson-400 fill-crimson-400' : 'text-white/20'}
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
