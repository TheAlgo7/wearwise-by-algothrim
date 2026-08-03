'use client';

import { cn } from '@/lib/cn';
import { SEASON_META } from '@/lib/season';
import type { Item, Outfit } from '@/types';
import { Check, Heart, Loader2, Shirt, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useMemo } from 'react';

const LAYER_ORDER: Record<string, number> = {
  base: 0, mid: 1, outer: 2, bottom: 3, footwear: 4,
  timepiece: 5, accessory: 6, eyewear: 7, headwear: 8, jewelry: 9,
};

interface Props {
  look: Outfit;
  itemById: Map<string, Item>;
  /** Owner-only controls. */
  canManage?: boolean;
  worn?: boolean;
  wearing?: boolean;
  onWear?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function LookCard({ look, itemById, canManage, worn, wearing, onWear, onDelete, className }: Props) {
  const resolved = useMemo(
    () =>
      Array.from(
        new Map(
          look.items
            .map((id) => itemById.get(id))
            .filter((i): i is Item => Boolean(i))
            .map((i) => [i.id, i])
        ).values()
      ).sort(
        (a, b) =>
          (LAYER_ORDER[a.category?.layer_type ?? ''] ?? 99) - (LAYER_ORDER[b.category?.layer_type ?? ''] ?? 99)
      ),
    [look.items, itemById]
  );

  const fromPartner = look.created_by === 'partner';
  const missing = look.items.length - resolved.length;

  return (
    <article className={cn('glass-card p-4', className)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[16px] font-semibold leading-6 text-crimson-50">
            {look.name ?? 'Untitled look'}
          </h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-fog-400">
            {fromPartner && (
              <span className="inline-flex items-center gap-1 text-crimson-300">
                <Heart size={11} className="fill-current" aria-hidden />
                From Ishita
              </span>
            )}
            {fromPartner && look.season && <span aria-hidden>·</span>}
            {look.season && <span>{SEASON_META[look.season].label}</span>}
            {!fromPartner && !look.season && <span>{resolved.length} pieces</span>}
          </p>
        </div>

        {canManage && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${look.name ?? 'look'}`}
            className="press -mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-fog-400 transition-colors hover:text-error-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
          >
            <Trash2 size={15} aria-hidden />
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {resolved.map((it) => (
          <div
            key={it.id}
            className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-[1.1rem] border border-white/[0.08] bg-ink-0"
          >
            {it.image_url ? (
              <Image
                src={it.image_url}
                alt={it.name}
                width={72}
                height={72}
                sizes="72px"
                className="h-full w-full object-contain"
              />
            ) : (
              <Shirt size={22} className="text-crimson-100/30" strokeWidth={1.4} aria-hidden />
            )}
          </div>
        ))}
        {missing > 0 && (
          <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[1.1rem] border border-dashed border-white/[0.1] px-1 text-center text-[10px] leading-tight text-fog-400">
            {missing} removed
          </div>
        )}
      </div>

      {look.note && (
        <p className="mt-3 text-[13px] leading-[1.55] text-crimson-100/80 text-pretty">
          {fromPartner ? '“' : ''}{look.note}{fromPartner ? '”' : ''}
        </p>
      )}

      {look.ai_reasoning && !look.note && (
        <p className="mt-3 line-clamp-2 text-[12px] leading-5 text-crimson-100/60 text-pretty">
          {look.ai_reasoning}
        </p>
      )}

      {onWear && (
        <button
          type="button"
          onClick={onWear}
          disabled={wearing || worn}
          className={cn(
            'press mt-4 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full text-[14px] font-semibold transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400 disabled:opacity-70',
            worn ? 'bg-white/[0.07] text-fog-200' : 'bg-crimson-400 text-white'
          )}
        >
          {wearing ? (
            <><Loader2 size={15} className="animate-spin" aria-hidden /> Logging</>
          ) : worn ? (
            <><Check size={15} aria-hidden /> Worn today</>
          ) : (
            <><Check size={15} aria-hidden /> Wearing this</>
          )}
        </button>
      )}
    </article>
  );
}
