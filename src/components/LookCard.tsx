'use client';

import { OutfitComposition } from '@/components/OutfitComposition';
import { OneUISheet } from '@/components/oneui';
import { cn } from '@/lib/cn';
import { colourStory } from '@/lib/colour-story';
import { SEASON_META } from '@/lib/season';
import type { Item, Outfit } from '@/types';
import { Check, Heart, Loader2, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

/**
 * Saved looks, as a grid of small flat-lays.
 *
 * They used to be full-width cards, each with a sentence of reasoning and its
 * own full-width button. Seventeen of them made the screen about 5,000px tall,
 * and the button said "Wearing this", which reads like a status rather than
 * something to press. A look is recognised by its shape and colours, so the
 * grid shows exactly that; everything else is one tap away in the sheet.
 */

function useResolved(look: Outfit, itemById: Map<string, Item>) {
  return useMemo(
    () =>
      Array.from(
        new Map(
          look.items
            .map((id) => itemById.get(id))
            .filter((i): i is Item => Boolean(i))
            .map((i) => [i.id, i])
        ).values()
      ),
    [look.items, itemById]
  );
}

interface TileProps {
  look: Outfit;
  itemById: Map<string, Item>;
  worn?: boolean;
  onOpen: () => void;
  /** Position in the grid, for the stagger as the shelf settles in. */
  index?: number;
}

export function LookTile({ look, itemById, worn, onOpen, index = 0 }: TileProps) {
  const resolved = useResolved(look, itemById);
  const story = useMemo(() => colourStory(resolved), [resolved]);
  const fromPartner = look.created_by === 'partner';

  return (
    <button
      type="button"
      onClick={onOpen}
      className="press animate-shelf-in group block min-w-0 text-left focus-visible:outline-none"
      style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
      aria-label={`${look.name ?? 'Saved look'}${fromPartner ? ', from Ishita' : ''}${worn ? ', worn today' : ''}`}
    >
      <OutfitComposition
        items={resolved}
        className="aspect-square max-h-none rounded-[22px] p-1.5 ring-crimson-400 ring-offset-2 ring-offset-ink-0 group-focus-visible:ring-2"
      />
      <div className="mt-2 flex items-center gap-2 px-1">
        <p className="min-w-0 flex-1 truncate text-[14px] font-semibold text-fog-100">
          {look.name ?? 'Saved look'}
        </p>
        <span className="flex shrink-0 -space-x-1" aria-hidden>
          {story.swatches.slice(0, 3).map((s) => (
            <span key={s.name} className="h-2.5 w-2.5 rounded-full ring-1 ring-ink-0" style={{ background: s.hex }} />
          ))}
        </span>
      </div>
      <p className="mt-0.5 flex items-center gap-1 px-1 text-[12px] font-medium text-fog-400">
        {worn ? (
          <span className="inline-flex items-center gap-1 text-fog-200">
            <Check size={12} aria-hidden /> Worn today
          </span>
        ) : fromPartner ? (
          <span className="inline-flex items-center gap-1 text-crimson-300">
            <Heart size={11} className="fill-current" aria-hidden /> From Ishita
          </span>
        ) : (
          <span>{look.season ? SEASON_META[look.season].label : 'Any season'}</span>
        )}
      </p>
    </button>
  );
}

interface SheetProps {
  look: Outfit | null;
  itemById: Map<string, Item>;
  canManage?: boolean;
  worn?: boolean;
  wearing?: boolean;
  onClose: () => void;
  onWear?: () => void;
  onDelete?: () => void;
}

/** One look, large, with the only two things you can do with it. */
export function LookSheet({ look, itemById, canManage, worn, wearing, onClose, onWear, onDelete }: SheetProps) {
  return (
    <OneUISheet open={look !== null} onClose={onClose} title={look?.name ?? 'Saved look'}>
      {look && (
        <LookSheetBody
          key={look.id}
          look={look}
          itemById={itemById}
          canManage={canManage}
          worn={worn}
          wearing={wearing}
          onWear={onWear}
          onDelete={onDelete}
        />
      )}
    </OneUISheet>
  );
}

function LookSheetBody({
  look, itemById, canManage, worn, wearing, onWear, onDelete,
}: Omit<SheetProps, 'look' | 'onClose'> & { look: Outfit }) {
  const resolved = useResolved(look, itemById);
  const story = useMemo(() => colourStory(resolved), [resolved]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fromPartner = look.created_by === 'partner';
  const missing = look.items.length - resolved.length;

  return (
    <div className="flex flex-col gap-4 pb-1">
      <p className="-mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[13px] font-medium text-fog-300">
        {fromPartner && (
          <span className="inline-flex items-center gap-1 text-crimson-300">
            <Heart size={12} className="fill-current" aria-hidden /> From Ishita
          </span>
        )}
        {look.season && <span>{SEASON_META[look.season].label}</span>}
        {story.swatches.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full ring-1 ring-inset ring-white/[0.18]" style={{ background: s.hex }} aria-hidden />
            {s.name}
          </span>
        ))}
      </p>

      <div className="fit-stage" style={{ '--story': story.light } as React.CSSProperties}>
        <OutfitComposition items={resolved} priority animate />
      </div>

      {missing > 0 && (
        <p className="px-1 text-[12px] text-fog-400">
          {missing} {missing === 1 ? 'piece has' : 'pieces have'} since left the wardrobe.
        </p>
      )}

      {look.note ? (
        <p className="px-1 text-[15px] leading-[1.6] text-fog-100 text-pretty">
          {fromPartner ? `“${look.note}”` : look.note}
        </p>
      ) : look.ai_reasoning ? (
        <p className="px-1 text-[14px] leading-[1.6] text-fog-200 text-pretty">{look.ai_reasoning}</p>
      ) : null}

      {onWear && (
        <button
          type="button"
          onClick={onWear}
          disabled={wearing || worn}
          className={cn(
            'press flex h-14 w-full items-center justify-center gap-2.5 rounded-full text-[16px] font-semibold transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-100',
            worn ? 'bg-white/[0.07] text-fog-200' : 'bg-crimson-400 text-white hover:bg-crimson-500 disabled:opacity-70'
          )}
        >
          {wearing ? (
            <><Loader2 size={18} className="animate-spin" aria-hidden /> Logging</>
          ) : worn ? (
            <><Check size={18} className="animate-heart-in text-crimson-300" aria-hidden /> Worn today</>
          ) : (
            <><Check size={18} strokeWidth={2.3} aria-hidden /> Wear this today</>
          )}
        </button>
      )}

      {canManage && onDelete && (
        <button
          type="button"
          onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
          className={cn(
            'press inline-flex min-h-[44px] items-center justify-center gap-2 self-center rounded-full px-4 text-[14px] font-semibold transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400',
            confirmDelete ? 'bg-error/60 text-error-text' : 'text-fog-400 hover:text-fog-200'
          )}
        >
          <Trash2 size={15} aria-hidden />
          {confirmDelete ? 'Tap again to delete' : 'Delete look'}
        </button>
      )}
    </div>
  );
}
