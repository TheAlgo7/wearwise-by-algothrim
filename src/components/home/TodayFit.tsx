'use client';

import { OutfitComposition } from '@/components/OutfitComposition';
import { OutfitDetailSheet } from '@/components/OutfitDetailSheet';
import { cn } from '@/lib/cn';
import { colourStory } from '@/lib/colour-story';
import type { GeneratedOutfit, Item } from '@/types';
import { BookmarkCheck, BookmarkPlus, Check, ChevronLeft, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const LAYER_ORDER: Record<string, number> = {
  base: 0, mid: 1, outer: 2, bottom: 3, footwear: 4,
  timepiece: 5, accessory: 6, eyewear: 7, headwear: 8, jewelry: 9,
};

interface Props {
  outfit: GeneratedOutfit;
  items: Item[];
  itemById: Map<string, Item>;
  /** 0-based position in the current batch, and how many are in it. */
  index: number;
  total: number;
  worn: boolean;
  saved: boolean;
  /** True while a fresh batch is being fetched behind the current one. */
  busy: boolean;
  /** This fit answers an older question and is being replaced. */
  stale?: boolean;
  onWear: () => void;
  onAnother: () => void;
  onPrevious: () => void;
  onSave: () => void;
  /** Stop waiting and treat the fit already on screen as today's answer. */
  onKeepPrevious?: () => void;
}

/** How long to wait before offering an escape from a slow model call. */
const PATIENCE_MS = 8000;

/**
 * The answer, and only the answer.
 *
 * One outfit fills most of the screen, with a sentence explaining it and two
 * ways to respond: take it, or push back. The alternatives still exist — they
 * are just behind "Another option" instead of demanding to be compared in a
 * carousel before he has had coffee.
 */
export function TodayFit({
  outfit, items, itemById, index, total, worn, saved, busy, stale,
  onWear, onAnother, onPrevious, onSave, onKeepPrevious,
}: Props) {
  const [detailOpen, setDetailOpen] = useState(false);

  // Only offered once the wait stops being reasonable. Showing it immediately
  // would suggest the update is expected to fail.
  const [patienceSpent, setPatienceSpent] = useState(false);
  useEffect(() => {
    if (!stale) return;
    const t = setTimeout(() => setPatienceSpent(true), PATIENCE_MS);
    // Reset on the way out, so a second slow update starts the clock again
    // rather than offering the escape hatch instantly.
    return () => { clearTimeout(t); setPatienceSpent(false); };
  }, [stale]);

  const resolved = useMemo(
    () =>
      Array.from(
        new Map(
          outfit.items.map((id) => itemById.get(id)).filter(Boolean).map((i) => [i!.id, i!])
        ).values()
      ).sort(
        (a, b) =>
          (LAYER_ORDER[a.category?.layer_type ?? ''] ?? 99) -
          (LAYER_ORDER[b.category?.layer_type ?? ''] ?? 99)
      ),
    [outfit.items, itemById]
  );

  const story = useMemo(() => colourStory(resolved), [resolved]);
  // Remounting the plate on a new outfit is what replays the pieces settling in.
  const plateKey = resolved.map((i) => i.id).join('|');

  return (
    <>
      <section aria-label="Today's outfit" className="animate-oneui-fade flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 px-1">
          <h2 className="text-[17px] font-semibold leading-6 text-fog-100">Today&apos;s fit</h2>
          <div className="flex items-center gap-1">
            {stale ? (
              <span className="mr-1 flex items-center gap-1.5 text-[12px] font-medium text-fog-400">
                <Loader2 size={12} className="animate-spin" aria-hidden />
                Updating for today
              </span>
            ) : total > 1 ? (
              <span className="mr-1 text-[12px] font-medium tabular-nums text-fog-400">
                {index + 1} of {total}
              </span>
            ) : null}
            <button
              type="button"
              onClick={onSave}
              aria-label={saved ? 'Saved to your shelf' : 'Save this look'}
              aria-pressed={saved}
              className={cn(
                'press flex h-11 w-11 items-center justify-center rounded-full transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400',
                saved ? 'text-crimson-300' : 'text-fog-300 hover:text-fog-100'
              )}
            >
              {saved ? <BookmarkCheck size={19} aria-hidden /> : <BookmarkPlus size={19} aria-hidden />}
            </button>
          </div>
        </div>

        {/* The plate, lit by the outfit's own colour. */}
        <div className="fit-stage" style={{ '--story': story.light } as React.CSSProperties}>
          <button
            type="button"
            onClick={() => setDetailOpen(true)}
            aria-label={`See all ${resolved.length} pieces in this outfit`}
            className={cn(
              'press block w-full rounded-squircle-lg text-left transition-opacity duration-300',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400',
              stale && 'opacity-40'
            )}
          >
            <OutfitComposition key={plateKey} items={resolved} priority animate />
          </button>
        </div>

        {story.swatches.length > 0 && (
          <p
            className={cn(
              'flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[13px] font-medium text-fog-300 transition-opacity duration-300',
              stale && 'opacity-40'
            )}
            aria-label={`Colours: ${story.swatches.map((s) => s.name).join(', ')}`}
          >
            {story.swatches.map((s) => (
              <span key={s.name} className="inline-flex items-center gap-1.5" aria-hidden>
                <span
                  className="h-3 w-3 rounded-full ring-1 ring-inset ring-white/[0.18]"
                  style={{ background: s.hex }}
                />
                {s.name}
              </span>
            ))}
          </p>
        )}

        {/* An outfit that answers yesterday's question is not something to
            tap "Wear this" on, so the actions wait. If the model is taking
            long enough to notice, he can take this one anyway. */}
        {stale ? (
          <div className="flex flex-col gap-2">
            <div className="flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-white/[0.05] text-[15px] font-semibold text-fog-300">
              <Loader2 size={18} className="animate-spin" aria-hidden />
              Updating for today
            </div>
            {patienceSpent && onKeepPrevious && (
              <button
                type="button"
                onClick={onKeepPrevious}
                className="press animate-oneui-fade flex h-12 w-full items-center justify-center rounded-full text-[15px] font-semibold text-fog-200 transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
              >
                Keep previous fit
              </button>
            )}
          </div>
        ) : (
          /* One row, so both answers to "is this it?" sit above the fold. The
             column version put "Wear this" under the nav on a 6.8in phone. */
          <div className="flex items-center gap-2">
            {/* Going forward without being able to go back meant an option he
                liked was gone the moment he looked at the next one. */}
            {index > 0 && (
              <button
                type="button"
                onClick={onPrevious}
                aria-label="Previous option"
                className="press flex h-14 w-11 shrink-0 items-center justify-center rounded-full text-fog-300 transition-colors hover:bg-white/[0.06] hover:text-fog-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
              >
                <ChevronLeft size={20} aria-hidden />
              </button>
            )}
            <button
              type="button"
              onClick={onWear}
              disabled={worn}
              className={cn(
                'press flex h-14 min-w-0 flex-1 items-center justify-center gap-2.5 rounded-full text-[16px] font-semibold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-0',
                worn
                  ? 'bg-white/[0.07] text-fog-200'
                  : 'bg-crimson-400 text-white hover:bg-crimson-500'
              )}
            >
              <Check
                key={worn ? 'worn' : 'wear'}
                size={19}
                strokeWidth={2.3}
                aria-hidden
                className={worn ? 'animate-heart-in text-crimson-300' : undefined}
              />
              {worn ? 'Worn today' : 'Wear this'}
            </button>
            <button
              type="button"
              onClick={onAnother}
              disabled={busy}
              aria-label={
                busy ? 'Finding another outfit'
                : index + 1 < total ? `Another option, ${index + 2} of ${total}`
                : 'Generate a fresh option'
              }
              className={cn(
                'press flex h-14 shrink-0 items-center justify-center gap-1.5 rounded-full bg-white/[0.07] px-5 text-[15px] font-semibold text-fog-100 transition-colors',
                'hover:bg-white/[0.11] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400',
                'disabled:opacity-60'
              )}
            >
              {busy ? (
                <Loader2 size={17} className="animate-spin" aria-hidden />
              ) : index + 1 < total ? (
                <ChevronRight size={17} aria-hidden />
              ) : (
                <RefreshCw size={16} aria-hidden />
              )}
              Another
            </button>
          </div>
        )}

        {/* Tappable, because it is clamped and there was previously no way to
            tell that the rest of the sentence existed. */}
        <button
          type="button"
          onClick={() => setDetailOpen(true)}
          className={cn(
            'press block w-full rounded-squircle-sm px-1 text-left transition-opacity duration-300',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400',
            stale && 'opacity-40'
          )}
        >
          <span className="line-clamp-2 block text-[14px] leading-[1.55] text-fog-200 text-pretty">
            {outfit.reasoning}
          </span>
          <span className="mt-1 inline-flex items-center gap-0.5 text-[12px] font-semibold text-fog-400">
            Why this works
            <ChevronRight size={13} aria-hidden />
          </span>
        </button>
      </section>

      <OutfitDetailSheet
        outfit={outfit}
        items={items}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        saved={saved}
        worn={worn}
        onSave={onSave}
        onWear={() => { onWear(); setDetailOpen(false); }}
      />
    </>
  );
}

/** Shown while the first fit of the day is being put together. */
export function TodayFitSkeleton() {
  return (
    <section aria-label="Building today's outfit" className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[17px] font-semibold leading-6 text-fog-100">Today&apos;s fit</h2>
        <span className="flex items-center gap-2 text-[12px] font-medium text-fog-400">
          <Loader2 size={13} className="animate-spin" aria-hidden />
          Putting it together
        </span>
      </div>
      <div className="photo-well mx-auto aspect-[5/6] max-h-[38dvh] w-full animate-pulse rounded-squircle-lg" />
      <div className="h-4 w-1/2 animate-pulse rounded-full bg-white/[0.05]" />
      <div className="flex gap-2">
        <div className="h-14 flex-1 animate-pulse rounded-full bg-white/[0.05]" />
        <div className="h-14 w-[118px] animate-pulse rounded-full bg-white/[0.05]" />
      </div>
    </section>
  );
}
