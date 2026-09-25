'use client';

import { cn } from '@/lib/cn';
import type { Item, Outfit } from '@/types';
import { Check, ChevronRight, Heart, Loader2, Shirt } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useState } from 'react';

interface Props {
  picks: Outfit[];
  itemById: Map<string, Item>;
  onWear: (look: Outfit) => Promise<void>;
  /** Marks the pick as seen so it stops counting as new. */
  onSeen: (id: string) => void;
}

/**
 * What Ishita has chosen for him, on his home screen.
 *
 * This is the payoff of the whole partner feature, so it sits directly under
 * the greeting rather than behind a tab. Unseen picks carry a dot; opening one
 * clears it.
 */
export function PickInbox({ picks, itemById, onWear, onSeen }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [wornIds, setWornIds] = useState<Set<string>>(new Set());

  const wear = useCallback(
    async (look: Outfit) => {
      setBusyId(look.id);
      await onWear(look);
      setWornIds((prev) => new Set(prev).add(look.id));
      setBusyId(null);
    },
    [onWear]
  );

  if (picks.length === 0) return null;

  return (
    <section aria-label="Looks Ishita picked for you">
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <Heart size={13} className="fill-current text-crimson-300" aria-hidden />
          <h2 className="section-title">From Ishita</h2>
        </div>
        <Link
          href="/looks"
          className="inline-flex min-h-8 items-center gap-1 rounded-full px-2 text-[11px] font-semibold text-fog-400 transition-colors hover:text-crimson-200"
        >
          All looks
          <ChevronRight size={13} aria-hidden />
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 snap-x snap-mandatory px-4 pb-1">
        {picks.slice(0, 5).map((look) => {
          const resolved = look.items
            .map((id) => itemById.get(id))
            .filter((i): i is Item => Boolean(i))
            .slice(0, 5);
          const unseen = !look.seen_at;
          const worn = wornIds.has(look.id);

          return (
            <article
              key={look.id}
              className={cn(
                'glass-card w-[80vw] max-w-[360px] shrink-0 snap-start p-4',
                unseen && 'border-crimson-400/30'
              )}
              onPointerEnter={() => unseen && onSeen(look.id)}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="flex items-center gap-2 truncate text-[15px] font-semibold leading-5 text-fog-100">
                    {look.name ?? 'A look for you'}
                    {unseen && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-crimson-400" aria-label="New" />}
                  </h3>
                  <p className="mt-0.5 text-[11px] font-medium text-fog-400">
                    {new Date(look.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 overflow-hidden">
                {resolved.map((it) => (
                  <div
                    key={it.id}
                    className="photo-well h-14 w-14 shrink-0 overflow-hidden rounded-[16px]"
                  >
                    {it.image_url ? (
                      <Image
                        src={it.image_url}
                        alt={it.name}
                        width={56}
                        height={56}
                        sizes="56px"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Shirt size={18} className="text-fog-500" aria-hidden />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {look.note && (
                <p className="mt-3 line-clamp-3 text-[13px] leading-[1.55] text-fog-200 text-pretty">
                  “{look.note}”
                </p>
              )}

              <button
                type="button"
                onClick={() => wear(look)}
                disabled={busyId === look.id || worn}
                className={cn(
                  // Tonal: "Wear this" on the fit above is the one solid crimson
                  // button on this screen, and two competing ones read as a fork.
                  'press mt-4 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full text-[14px] font-semibold transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400 disabled:opacity-70',
                  worn ? 'bg-white/[0.07] text-fog-200' : 'bg-crimson-400/[0.16] text-crimson-200 hover:bg-crimson-400/[0.24]'
                )}
              >
                {busyId === look.id ? (
                  <><Loader2 size={15} className="animate-spin" aria-hidden /> Logging</>
                ) : worn ? (
                  <><Check size={15} aria-hidden /> Wearing it</>
                ) : (
                  <><Check size={15} aria-hidden /> Wear her pick</>
                )}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
