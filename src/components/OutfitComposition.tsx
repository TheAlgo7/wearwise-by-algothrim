'use client';

import { cn } from '@/lib/cn';
import { openShirtOverTee } from '@/lib/item-presentation';
import type { Item } from '@/types';
import { Shirt } from 'lucide-react';
import Image from 'next/image';
import { useMemo } from 'react';

interface Props {
  items: Item[];
  /** Load the main pieces first; the hero on Today. */
  priority?: boolean;
  /** Pieces arrive in dressing order. Off for thumbnails in a grid. */
  animate?: boolean;
  /** The outfit's own colour (an `rgb()` string). Lights the figure from behind. */
  light?: string;
  /** Image size hints: the full-width hero, or a thumbnail. */
  scale?: 'hero' | 'tile';
  /**
   * Paint a floor under the light. Needed anywhere the figure is not on the
   * black canvas (a sheet, a card): the photos' black margins only vanish into
   * what is inside the figure, so on grey they would show as squares.
   */
  floor?: string;
  className?: string;
}

/**
 * An outfit drawn as the silhouette it makes.
 *
 * Revamp, November 2026. The flat-lay that came before put each piece in
 * whatever box was left over, so the trousers came out smaller than the boot
 * and the belt was a speck. His style is proportion first (a boxy top over a
 * bootcut with a long hem over chunky shoes), so the look is drawn head to toe
 * at true scale: the top over the bottom on one axis, and the pieces that
 * finish it in a column beside, head items at the top and shoes at the hem.
 *
 * Scaling by category is trustworthy because the photos are: every garment is
 * a square shot on black with a steady margin (measured across all 120 on
 * 6 Nov 2026: tops fill about 90% of the height, trousers about 87% and 46% of
 * the width). Photos are screen-blended, so their black vanishes into the
 * light and overlapping margins never show; the geometry below keeps garment
 * from landing on garment.
 *
 * The figure is a size container, so everything is in container units and the
 * same layout works as the Today hero and as a 160px tile. Being a container
 * also makes it a stacking context, which is why the light lives in here: the
 * garments can only blend with what is inside it.
 */

/** Square photo boxes as a share of the figure's height. */
const TOP_BOX = 44;
const BOTTOM_BOX = 65;
/**
 * Shorts photos fill their frame exactly like trousers do, so drawn at the
 * trouser scale they came out as long as trousers. About half the length.
 */
const SHORTS_BOX = 40;
/** Where the bottom's waistband sits, just under the top's hem. */
const WAIST = 43;
/** The margin above the waistband inside a trouser photo, as a share of its box. */
const BOTTOM_PHOTO_MARGIN = 0.065;
/** A lone top or bottom (a partial look) gets most of the height. */
const SOLO_BOX = 82;

/** Side column slots, top to bottom, and how much height each asks for. */
const HEAD_SLOTS = ['headwear', 'eyewear'] as const;
const SIDE_BASIS: Record<string, number> = {
  headwear: 16,
  eyewear: 10,
  under: 24,
  jewelry: 9,
  timepiece: 15,
  accessory: 13,
  bottom: 24,
  footwear: 24,
};
const BODY_ORDER = ['under', 'bottom', 'jewelry', 'timepiece', 'accessory', 'footwear'];

interface Placed {
  item: Item;
  slot: string;
}

function arrange(items: Item[]) {
  const layer = (i: Item) => i.category?.layer_type ?? '';
  const over = openShirtOverTee(items);

  // The piece you see first leads: an outer layer, then a mid layer or a
  // shirt worn open, and only then the base. Whatever is under it goes beside.
  const fronts = [
    ...items.filter((i) => layer(i) === 'outer'),
    ...items.filter((i) => layer(i) === 'mid'),
    ...(over ? [over] : []),
    ...items.filter((i) => layer(i) === 'base' && i !== over),
  ];
  const top = fronts[0] ?? null;
  const bottoms = items.filter((i) => layer(i) === 'bottom');
  const bottom = bottoms[0] ?? null;

  const side: Placed[] = [
    ...fronts.slice(1).map((item) => ({ item, slot: 'under' })),
    ...bottoms.slice(1).map((item) => ({ item, slot: 'bottom' })),
    ...items
      .filter((i) => !['outer', 'mid', 'base', 'bottom'].includes(layer(i)))
      .map((item) => ({ item, slot: SIDE_BASIS[layer(item)] ? layer(item) : 'accessory' })),
  ];

  const head = side.filter((p) => (HEAD_SLOTS as readonly string[]).includes(p.slot));
  const body = side
    .filter((p) => !(HEAD_SLOTS as readonly string[]).includes(p.slot))
    .sort((a, b) => BODY_ORDER.indexOf(a.slot) - BODY_ORDER.indexOf(b.slot));

  // The order you get dressed in, which is the order pieces arrive in.
  const dressing = [
    ...body.filter((p) => p.slot === 'under').map((p) => p.item),
    ...(top ? [top] : []),
    ...(bottom ? [bottom] : []),
    ...body.filter((p) => p.slot === 'footwear').map((p) => p.item),
    ...head.map((p) => p.item),
    ...body.filter((p) => p.slot !== 'under' && p.slot !== 'footwear').map((p) => p.item),
  ];

  return { top, bottom, head, body, dressing };
}

export function OutfitComposition({
  items, priority, animate = false, light, scale = 'hero', floor, className,
}: Props) {
  const plan = useMemo(() => arrange(items), [items]);
  const { top, bottom, head, body } = plan;
  const hasSide = head.length + body.length > 0;
  const axis = hasSide ? 35 : 50;
  const bottomBox = bottom && /short/i.test(bottom.category?.name ?? '') ? SHORTS_BOX : BOTTOM_BOX;

  const order = new Map(plan.dressing.map((it, i) => [it.id, i]));
  const step = (it: Item) => (animate ? order.get(it.id) ?? 0 : null);
  const mainSizes = scale === 'hero' ? '(max-width: 640px) 72vw, 340px' : '(max-width: 640px) 36vw, 180px';
  const sideSizes = scale === 'hero' ? '(max-width: 640px) 34vw, 160px' : '(max-width: 640px) 18vw, 90px';

  // A lone hero may spill its light; anything sitting next to something else
  // (a tile in a grid, a figure boxed on a sheet) keeps it inside and clips.
  const spills = scale === 'hero' && !floor;
  const lightX = spills
    ? `${((axis + 3 + 30) / 160) * 100}%` // the spilling box runs from -30% to 130% of the width
    : `${axis + 3}%`;

  return (
    <div
      className={cn('relative aspect-[4/5] w-full', !spills && 'overflow-hidden', className)}
      style={{ containerType: 'size', '--light-x': lightX } as React.CSSProperties}
    >
      {floor && <div aria-hidden className="absolute inset-0" style={{ background: floor }} />}
      {light && (
        <div
          aria-hidden
          className={spills ? 'look-light' : 'look-light-tile'}
          style={{ '--story': light } as React.CSSProperties}
        />
      )}

      {top && bottom ? (
        <>
          <Piece
            item={top}
            sizes={mainSizes}
            priority={priority}
            step={step(top)}
            style={{
              left: `calc(${axis}cqw - ${TOP_BOX / 2}cqh)`,
              top: 0,
              width: `${TOP_BOX}cqh`,
              height: `${TOP_BOX}cqh`,
            }}
          />
          <Piece
            item={bottom}
            sizes={mainSizes}
            priority={priority}
            step={step(bottom)}
            style={{
              left: `calc(${axis}cqw - ${bottomBox / 2}cqh)`,
              top: `${WAIST - bottomBox * BOTTOM_PHOTO_MARGIN}cqh`,
              width: `${bottomBox}cqh`,
              height: `${bottomBox}cqh`,
            }}
          />
        </>
      ) : top || bottom ? (
        <Piece
          item={(top ?? bottom)!}
          sizes={mainSizes}
          priority={priority}
          step={step((top ?? bottom)!)}
          style={{
            left: `calc(${axis}cqw - ${SOLO_BOX / 2}cqh)`,
            top: `${(100 - SOLO_BOX) / 2}cqh`,
            width: `${SOLO_BOX}cqh`,
            height: `${SOLO_BOX}cqh`,
          }}
        />
      ) : null}

      {top || bottom ? (
        hasSide && (
          <div className="absolute inset-y-0 right-0 flex w-[33cqw] flex-col gap-[2.5cqh]">
            {head.map((p) => (
              <SidePiece key={p.item.id} placed={p} sizes={sideSizes} step={step(p.item)} />
            ))}
            <div className="min-h-0 flex-1" />
            {body.map((p) => (
              <SidePiece key={p.item.id} placed={p} sizes={sideSizes} step={step(p.item)} />
            ))}
          </div>
        )
      ) : (
        // Nothing to stand up (only accessories): an even grid, never an empty figure.
        <div className="absolute inset-0 grid grid-cols-2 place-items-center gap-[4cqh] p-[6cqh]">
          {items.slice(0, 4).map((it) => (
            <div key={it.id} className="relative h-full w-full">
              <Photo item={it} sizes={sideSizes} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function arrival(step: number | null): React.CSSProperties | undefined {
  return step === null
    ? undefined
    : { animation: `piece-in 460ms var(--ease-spring) ${step * 55}ms backwards` };
}

function Piece({
  item, style, sizes, priority, step,
}: {
  item: Item;
  style: React.CSSProperties;
  sizes: string;
  priority?: boolean;
  step: number | null;
}) {
  return (
    <div className="garment absolute" style={{ ...style, ...arrival(step) }}>
      <Photo item={item} sizes={sizes} priority={priority} />
    </div>
  );
}

function SidePiece({ placed, sizes, step }: { placed: Placed; sizes: string; step: number | null }) {
  return (
    <div
      className="garment relative min-h-0 w-full"
      style={{ flex: `0 1 ${SIDE_BASIS[placed.slot] ?? 13}cqh`, ...arrival(step) }}
    >
      <Photo item={placed.item} sizes={sizes} />
    </div>
  );
}

function Photo({ item, sizes, priority }: { item: Item; sizes: string; priority?: boolean }) {
  if (!item.image_url) {
    return (
      <div className="flex h-full w-full items-center justify-center" role="img" aria-label={item.name}>
        <Shirt size={26} strokeWidth={1.3} className="text-fog-500" aria-hidden />
      </div>
    );
  }
  return (
    <Image
      src={item.image_url}
      alt={item.name}
      fill
      sizes={sizes}
      className="object-contain"
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
    />
  );
}
