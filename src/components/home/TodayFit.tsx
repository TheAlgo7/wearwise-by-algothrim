'use client';

import { OutfitComposition } from '@/components/OutfitComposition';
import { OutfitDetailSheet } from '@/components/OutfitDetailSheet';
import { cn } from '@/lib/cn';
import { colourStory } from '@/lib/colour-story';
import { readOrder } from '@/lib/item-presentation';
import type { GeneratedOutfit, Item } from '@/types';
import { BookmarkCheck, BookmarkPlus, Check, ChevronLeft, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

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
/** A horizontal drag this long, and clearly sideways, is a swipe, not a tap. */
const SWIPE_PX = 48;

/**
 * The answer, and only the answer.
 *
 * Revamp, November 2026: the outfit stands on the black canvas head to toe,
 * lit by its own colour, with no plate around it. It is named by its colours
 * ("Burgundy over black"), because that is the decision he is making. Swipe it
 * for the next option, tap it for every piece, and the two answers to "is this
 * it?" sit right under it: wear it, or push back.
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
      readOrder(
        Array.from(
          new Map(
            outfit.items.map((id) => itemById.get(id)).filter(Boolean).map((i) => [i!.id, i!])
          ).values()
        )
      ),
    [outfit.items, itemById]
  );

  const story = useMemo(() => colourStory(resolved), [resolved]);
  // Remounting the figure on a new outfit is what replays the pieces arriving.
  const figureKey = resolved.map((i) => i.id).join('|');

  // ── Swipe between options ──
  const drag = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const canGoBack = index > 0;

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY };
    swiped.current = false;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const start = drag.current;
    drag.current = null;
    if (!start || stale) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    swiped.current = true;
    if (dx < 0) {
      if (!busy) onAnother();
    } else if (canGoBack) {
      onPrevious();
    }
  };

  const dim = stale ? 'opacity-40' : undefined;

  return (
    <>
      <section aria-label="Today's outfit" className="flex flex-col">
        {/* The figure. Tap for every piece, swipe for another option. */}
        <button
          type="button"
          onClick={() => {
            if (swiped.current) { swiped.current = false; return; }
            setDetailOpen(true);
          }}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => { drag.current = null; }}
          aria-label={`${story.headline || 'Today’s outfit'}. ${resolved.length} pieces. Open for details.`}
          style={{ touchAction: 'pan-y' }}
          className={cn(
            'relative -mx-2 mt-2 block select-none rounded-[28px] px-2 text-left transition-opacity duration-300',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400',
            dim
          )}
        >
          <OutfitComposition
            key={figureKey}
            items={resolved}
            light={story.light}
            priority
            animate
            // 46% of the screen: with a two-line greeting on his phone (360 x 756
            // installed), "Wear this" still clears the nav bar.
            className="aspect-auto h-[min(46dvh,420px)]"
          />
        </button>

        {/* Where this sits among the options: the swipe's own indicator, under it. */}
        {total > 1 && !stale && (
          <div className="mt-1 flex justify-center gap-1" role="img" aria-label={`Option ${index + 1} of ${total}`}>
            {Array.from({ length: total }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1 rounded-full transition-all duration-300',
                  i === index ? 'w-4 bg-fog-200' : 'w-1.5 bg-fog-500'
                )}
              />
            ))}
          </div>
        )}

        {/* Named by its colours: that is the decision he is making. */}
        <div className={cn('mt-3 flex items-start gap-3 px-1 transition-opacity duration-300', dim)}>
          <h2 className="type-headline min-w-0 flex-1 pt-1.5 text-balance">
            {story.headline || 'Today’s fit'}
          </h2>

          {stale && (
            <span className="flex shrink-0 items-center gap-1.5 pt-3 text-[12px] font-medium text-fog-400">
              <Loader2 size={12} className="animate-spin" aria-hidden />
              Updating
            </span>
          )}

          <button
            type="button"
            onClick={onSave}
            aria-label={saved ? 'Saved to your shelf' : 'Save this look'}
            aria-pressed={saved}
            className={cn(
              'press -mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400',
              saved ? 'text-crimson-300' : 'text-fog-300 hover:text-fog-100'
            )}
          >
            {saved ? <BookmarkCheck size={19} aria-hidden /> : <BookmarkPlus size={19} aria-hidden />}
          </button>
        </div>

        {/* An outfit that answers yesterday's question is not something to
            tap "Wear this" on, so the actions wait. If the model is taking
            long enough to notice, he can take this one anyway. */}
        {stale ? (
          <div className="mt-3 flex flex-col gap-2">
            <div className="flex h-[52px] w-full items-center justify-center gap-2.5 rounded-full border border-white/[0.08] text-[15px] font-semibold text-fog-300">
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
          <div className="mt-3 flex items-center gap-2">
            {/* Going forward without being able to go back meant an option he
                liked was gone the moment he looked at the next one. */}
            {canGoBack && (
              <button
                type="button"
                onClick={onPrevious}
                aria-label="Previous option"
                className="press flex h-[52px] w-11 shrink-0 items-center justify-center rounded-full text-fog-300 transition-colors hover:bg-white/[0.06] hover:text-fog-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
              >
                <ChevronLeft size={20} aria-hidden />
              </button>
            )}
            <button
              type="button"
              onClick={onWear}
              disabled={worn}
              className={cn(
                'press flex h-[52px] min-w-0 flex-1 items-center justify-center gap-2 rounded-full text-[16px] font-semibold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-0',
                worn
                  ? 'border border-white/[0.10] text-fog-200'
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
                'press flex h-[52px] shrink-0 items-center justify-center gap-1.5 rounded-full border border-white/[0.12] px-5 text-[15px] font-semibold text-fog-100 transition-colors',
                'hover:border-white/[0.2] hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400',
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
            'press mt-3.5 block w-full rounded-squircle-sm px-1 text-left transition-opacity duration-300',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400',
            dim
          )}
        >
          <span className="line-clamp-2 text-[14px] leading-[1.55] text-fog-300 text-pretty">
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

/** Shown while the first fit of the day is being put together: the figure's own shape, waiting. */
export function TodayFitSkeleton() {
  return (
    <section aria-label="Building today's outfit" className="flex flex-col">
      <div className="relative mt-2 h-[min(46dvh,420px)] w-full" style={{ containerType: 'size' }}>
        <div className="skeleton absolute left-[calc(35cqw-16cqh)] top-[3cqh] h-[38cqh] w-[32cqh] animate-pulse rounded-[22%]" />
        <div className="skeleton absolute left-[calc(35cqw-10cqh)] top-[44cqh] h-[53cqh] w-[20cqh] animate-pulse rounded-[18%]" />
        <div className="skeleton absolute bottom-[3cqh] right-[4cqw] h-[16cqh] w-[24cqw] animate-pulse rounded-[30%]" />
      </div>
      <div className="mt-3 flex items-center gap-2 px-1 text-[13px] font-medium text-fog-400">
        <Loader2 size={13} className="animate-spin" aria-hidden />
        Putting today&apos;s fit together
      </div>
      <div className="mt-3 flex gap-2">
        <div className="skeleton h-[52px] flex-1 animate-pulse rounded-full" />
        <div className="skeleton h-[52px] w-[118px] animate-pulse rounded-full" />
      </div>
    </section>
  );
}
