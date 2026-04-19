'use client';

import { OneUIButton } from '@/components/oneui';
import { cn } from '@/lib/cn';
import { Check, BookmarkPlus, BookmarkCheck, Star } from 'lucide-react';
import Image from 'next/image';
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
  const byId = new Map(items.map((i) => [i.id, i]));
  const resolved = outfit.items.map((id) => byId.get(id)).filter(Boolean) as Item[];

  return (
    <div className={cn('glass-card p-5 animate-oneui-fade', className)}>
      {/* Item strip */}
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar">
        {resolved.map((it) => (
          <div
            key={it.id}
            className="shrink-0 w-[88px] h-[88px] rounded-[1.25rem] overflow-hidden flex items-center justify-center"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            title={it.name}
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
              <span className="text-oneui-tab text-[#FFD9DA]/50 text-center px-2 leading-tight">{it.name}</span>
            )}
          </div>
        ))}
      </div>

      {/* Names */}
      <div className="mt-3 overflow-x-auto no-scrollbar flex gap-2 pb-0.5">
        {resolved.map((it) => (
          <span
            key={it.id}
            className="shrink-0 text-oneui-cap text-[#FF86A0] bg-[#E2335D]/10 rounded-full px-2.5 py-0.5"
          >
            {it.name}
          </span>
        ))}
      </div>

      {/* Reasoning */}
      <p className="mt-3 text-oneui-body text-[#FFD9DA]/80 text-pretty line-clamp-2">{outfit.reasoning}</p>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2">
        <OneUIButton
          intent={worn ? 'secondary' : 'primary'}
          size="sm"
          onClick={onWear}
          leftIcon={<Check size={15} />}
          className="flex-1"
        >
          {worn ? 'Worn today' : "Wearing this"}
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
        <div className="mt-4 flex items-center gap-1.5 justify-center">
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
  );
}
