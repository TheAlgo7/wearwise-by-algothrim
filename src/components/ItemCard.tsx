'use client';

import { cn } from '@/lib/cn';
import { swatchFor } from '@/lib/colour-story';
import { itemImageInset } from '@/lib/item-presentation';
import Image from 'next/image';
import Link from 'next/link';
import type { Item } from '@/types';
import { Shirt } from 'lucide-react';

interface Props {
  item: Item;
  compact?: boolean;
  priority?: boolean;
  className?: string;
}

/**
 * One piece on a shelf.
 *
 * It was a bordered card holding a black image box holding the photo, with a
 * one-line name that cut most of the wardrobe off mid-word ("Black Long-Sle...").
 * Now the photo sits straight on its plate, like a shop shelf, and the name gets
 * two lines. The colour dot is the fastest way to find a piece in a rail of
 * look-alike tees.
 */
export function ItemCard({ item, compact, priority, className }: Props) {
  const swatch = swatchFor(item.primary_color);
  const meta = [item.primary_color, item.fit].filter(Boolean).join(' · ');

  return (
    <Link
      href={`/wardrobe/${item.id}`}
      className={cn(
        'press group block min-w-0 rounded-[18px] focus-visible:outline-none',
        className
      )}
    >
      <div
        className={cn(
          'photo-well relative w-full overflow-hidden rounded-[18px] ring-crimson-400 ring-offset-2 ring-offset-ink-0 group-focus-visible:ring-2',
          compact ? 'aspect-square' : 'aspect-[3/4]'
        )}
      >
        {item.image_url ? (
          <div className={cn('absolute', itemImageInset(item))}>
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              sizes="(max-width: 480px) 50vw, 200px"
              className="object-contain"
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'auto'}
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Shirt className="text-fog-500" size={32} strokeWidth={1.4} aria-hidden />
          </div>
        )}
      </div>
      <p className="mt-2 line-clamp-2 px-0.5 text-[13px] font-semibold leading-[1.3] text-fog-100">
        {item.name}
      </p>
      {meta && (
        <p className="mt-0.5 flex items-center gap-1.5 px-0.5 text-[11px] capitalize text-fog-400">
          {swatch && (
            <span
              className="h-2 w-2 shrink-0 rounded-full ring-1 ring-inset ring-white/[0.2]"
              style={{ background: swatch }}
              aria-hidden
            />
          )}
          <span className="truncate">{meta}</span>
        </p>
      )}
    </Link>
  );
}
