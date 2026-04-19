'use client';

import { OneUIButton } from '@/components/oneui';
import { cn } from '@/lib/cn';
import { Check, Heart, Star } from 'lucide-react';
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
  const conf = Math.round((outfit.confidence ?? 0) * 100);

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
      <div className="mt-3 flex flex-wrap gap-x-2 gap-y-0.5 text-oneui-cap text-[#FF86A0]">
        {resolved.map((it, idx) => (
          <span key={it.id}>
            {it.name}{idx < resolved.length - 1 ? ' ·' : ''}
          </span>
        ))}
      </div>

      {/* Reasoning */}
      <p className="mt-3 text-oneui-body text-[#FFD9DA]/80 text-pretty">{outfit.reasoning}</p>

      {/* Confidence bar */}
      <div className="mt-4 flex items-center gap-3">
        <span className="text-oneui-cap text-[#FF86A0] font-semibold tracking-wider uppercase shrink-0">
          Confidence
        </span>
        <div className="flex-1 h-1 bg-white/[0.08] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${conf}%`,
              background: 'linear-gradient(90deg, #E2335D, #FF86A0)',
              boxShadow: '0 0 8px rgba(226,51,93,0.6)',
            }}
          />
        </div>
        <span className="text-oneui-cap font-bold text-[#FFEDE8] tabular-nums shrink-0">{conf}%</span>
      </div>

      {/* Actions */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <OneUIButton
          intent={worn ? 'primary' : 'secondary'}
          size="sm"
          onClick={onWear}
          leftIcon={<Check size={15} />}
        >
          {worn ? 'Worn today' : "I'm wearing this"}
        </OneUIButton>
        <OneUIButton
          intent={saved ? 'primary' : 'outline'}
          size="sm"
          onClick={onSave}
          leftIcon={<Heart size={15} fill={saved ? 'currentColor' : 'none'} />}
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
