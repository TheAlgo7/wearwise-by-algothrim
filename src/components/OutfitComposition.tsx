'use client';

import { cn } from '@/lib/cn';
import type { Item } from '@/types';
import { Shirt } from 'lucide-react';
import Image from 'next/image';
import { useMemo } from 'react';

interface Props {
  items: Item[];
  /** Larger images on the hero card, smaller in lists. */
  priority?: boolean;
  className?: string;
}

/**
 * An outfit drawn as a flat-lay, not as a row of database rows.
 *
 * The old card put every piece in an 88px square and scrolled them sideways,
 * which read as inventory: five products that happen to share a card. Laid out
 * the way the clothes actually sit — shirt large up top, bottom under it, shoes
 * to one side, watch and glasses alongside — the same five items read as one
 * look, which is the thing being recommended.
 *
 * One canvas, no per-item borders. The borders were what made it a list.
 */

const BANDS = {
  top: ['base'],
  layer: ['mid', 'outer'],
  bottom: ['bottom'],
  shoes: ['footwear'],
  extra: ['headwear', 'eyewear', 'timepiece', 'jewelry', 'accessory'],
} as const;

function bandOf(item: Item): keyof typeof BANDS | null {
  const layer = item.category?.layer_type;
  if (!layer) return null;
  for (const [band, layers] of Object.entries(BANDS)) {
    if ((layers as readonly string[]).includes(layer)) return band as keyof typeof BANDS;
  }
  return null;
}

export function OutfitComposition({ items, priority, className }: Props) {
  const grouped = useMemo(() => {
    const out: Record<keyof typeof BANDS, Item[]> = {
      top: [], layer: [], bottom: [], shoes: [], extra: [],
    };
    const loose: Item[] = [];
    for (const it of items) {
      const band = bandOf(it);
      if (band) out[band].push(it);
      else loose.push(it);
    }
    // Anything with an unmapped category still has to show up somewhere.
    out.extra.push(...loose);
    return out;
  }, [items]);

  const { top, layer, bottom, shoes, extra } = grouped;
  const hasExtras = extra.length > 0;

  /**
   * Promote whatever is actually there into the hero position.
   *
   * An outfit built on an overshirt with no tee under it has nothing in the
   * `base` slot, and the first version left that slot as a large empty rectangle
   * with the shirt tucked into the small side column. Each band takes its lead
   * piece from the first slot that has one.
   */
  const topLead = top.length > 0 ? top : layer.slice(0, 1);
  const topSide = top.length > 0 ? layer : layer.slice(1);
  const bottomLead = bottom.length > 0 ? bottom : shoes.slice(0, 1);
  const bottomSide = bottom.length > 0 ? shoes : shoes.slice(1);

  // Nothing recognisable to arrange — fall back to an even grid rather than
  // rendering an empty canvas.
  if (topLead.length === 0 && bottomLead.length === 0) {
    return (
      <div className={cn('rounded-squircle-lg bg-ink-0 p-3', className)}>
        <div className="grid grid-cols-3 gap-2">
          {items.map((it) => (
            <Cell key={it.id} item={it} priority={priority} />
          ))}
        </div>
      </div>
    );
  }

  const topSpan = topSide.length > 0 ? 4 : 6;
  const bottomSpan = bottomSide.length > 0 ? 3 : 6;
  // Row track sizes, one per band that actually has something in it.
  const rows = [
    topLead.length > 0 ? '2.1fr' : null,
    bottomLead.length > 0 ? '2fr' : null,
    hasExtras ? '1fr' : null,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cn(
        // Capped in viewport units, not just by aspect ratio: on a tall phone an
        // unbounded 5:6 canvas pushed "Wear this" under the nav bar, which is
        // the one thing this screen exists to put in front of him.
        'mx-auto grid w-full gap-2 rounded-squircle-lg bg-ink-0 p-2',
        hasExtras ? 'aspect-[5/6] max-h-[43dvh]' : 'aspect-square max-h-[43dvh]',
        className
      )}
      style={{
        gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
        gridTemplateRows: rows,
      }}
    >
      {/* Band one: the piece the look is built around, plus what goes over it */}
      {topLead.length > 0 && (
        <div className="min-h-0" style={{ gridColumn: `span ${topSpan}` }}>
          <Stack items={topLead} priority={priority} />
        </div>
      )}
      {topSide.length > 0 && (
        <div className="min-h-0" style={{ gridColumn: 'span 2' }}>
          <Stack items={topSide} priority={priority} />
        </div>
      )}

      {/* Band two: bottom, and what is on his feet */}
      {bottomLead.length > 0 && (
        <div className="min-h-0" style={{ gridColumn: `span ${bottomSpan}` }}>
          <Stack items={bottomLead} priority={priority} />
        </div>
      )}
      {bottomSide.length > 0 && (
        <div className="min-h-0" style={{ gridColumn: 'span 3' }}>
          <Stack items={bottomSide} priority={priority} />
        </div>
      )}

      {/* Band three: watch, glasses, cap — the pieces that finish it */}
      {hasExtras && (
        <div className="min-h-0" style={{ gridColumn: 'span 6' }}>
          <div className="flex h-full items-center justify-center gap-2">
            {extra.slice(0, 4).map((it) => (
              <div key={it.id} className="h-full min-w-0 flex-1">
                <Cell item={it} priority={false} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** One or two pieces sharing a slot, split vertically when there are two. */
function Stack({ items, priority }: { items: Item[]; priority?: boolean }) {
  if (items.length === 0) return <div className="h-full" />;
  if (items.length === 1) return <Cell item={items[0]} priority={priority} />;
  return (
    <div className="flex h-full flex-col gap-2">
      {items.slice(0, 2).map((it) => (
        <div key={it.id} className="min-h-0 flex-1">
          <Cell item={it} priority={false} />
        </div>
      ))}
    </div>
  );
}

function Cell({ item, priority }: { item: Item; priority?: boolean }) {
  return (
    <div className="relative h-full w-full">
      {item.image_url ? (
        <Image
          src={item.image_url}
          alt={item.name}
          fill
          sizes="(max-width: 640px) 60vw, 340px"
          className="object-contain"
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Shirt size={26} strokeWidth={1.3} className="text-fog-500" aria-hidden />
        </div>
      )}
    </div>
  );
}
