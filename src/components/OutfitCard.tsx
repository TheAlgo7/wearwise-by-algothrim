'use client';

import { Squircle, OneUIButton } from '@/components/oneui';
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
    <Squircle variant="raised" className={cn('p-4', className)}>
      {/* Item strip */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {resolved.map((it) => (
          <div
            key={it.id}
            className="shrink-0 w-24 h-24 rounded-squircle-sm bg-ink-300 overflow-hidden flex items-center justify-center border border-white/[0.04]"
            title={it.name}
          >
            {it.image_url ? (
              <Image
                src={it.image_url}
                alt={it.name}
                width={96}
                height={96}
                className="w-full h-full object-contain"
                unoptimized
              />
            ) : (
              <span className="text-oneui-tab text-fog-400 text-center px-1">{it.name}</span>
            )}
          </div>
        ))}
      </div>

      {/* Name row */}
      <div className="mt-3 flex flex-wrap gap-x-2 gap-y-0.5 text-oneui-cap text-fog-300">
        {resolved.map((it, idx) => (
          <span key={it.id}>
            {it.name}{idx < resolved.length - 1 ? ' ·' : ''}
          </span>
        ))}
      </div>

      {/* Reasoning */}
      <p className="mt-3 text-oneui-body text-fog-200 text-pretty">{outfit.reasoning}</p>

      {/* Confidence */}
      <div className="mt-3 flex items-center gap-2">
        <span className="oneui-hero-sub text-fog-400">Confidence</span>
        <div className="flex-1 h-1.5 bg-ink-400 rounded-full overflow-hidden">
          <div
            className="h-full bg-crimson-gradient rounded-full transition-all"
            style={{ width: `${conf}%` }}
          />
        </div>
        <span className="text-oneui-cap font-semibold text-fog-100 tabular-nums">{conf}%</span>
      </div>

      {/* Actions */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <OneUIButton
          intent={worn ? 'primary' : 'secondary'}
          size="sm"
          onClick={onWear}
          leftIcon={<Check size={16} />}
        >
          {worn ? 'Worn today' : "I'm wearing this"}
        </OneUIButton>
        <OneUIButton
          intent={saved ? 'primary' : 'outline'}
          size="sm"
          onClick={onSave}
          leftIcon={<Heart size={16} fill={saved ? 'currentColor' : 'none'} />}
        >
          {saved ? 'Saved' : 'Save'}
        </OneUIButton>
      </div>

      {/* Rating */}
      {onRate && (
        <div className="mt-3 flex items-center gap-1 justify-center">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => onRate(n)}
              aria-label={`Rate ${n}`}
              className="press p-1"
            >
              <Star
                size={18}
                className={n <= (rating ?? 0) ? 'text-crimson-300 fill-crimson-400' : 'text-fog-500'}
              />
            </button>
          ))}
        </div>
      )}
    </Squircle>
  );
}
