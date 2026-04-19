'use client';

import { Squircle } from '@/components/oneui';
import { cn } from '@/lib/cn';
import Image from 'next/image';
import Link from 'next/link';
import type { Item } from '@/types';
import { Shirt } from 'lucide-react';

interface Props {
  item: Item;
  compact?: boolean;
  className?: string;
}

export function ItemCard({ item, compact, className }: Props) {
  return (
    <Link href={`/wardrobe/${item.id}`} className={cn('block press', className)}>
      <Squircle variant="flat" className={cn('overflow-hidden', compact && 'rounded-squircle-sm')}>
        <div
          className={cn('relative w-full flex items-center justify-center', compact ? 'aspect-square' : 'aspect-[3/4]')}
          style={{ background: 'radial-gradient(ellipse at 50% 38%, #2c2930 0%, #0e0c10 100%)' }}
        >
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              sizes="(max-width: 480px) 50vw, 200px"
              className="object-contain p-1"
              unoptimized
            />
          ) : (
            <Shirt className="text-fog-500" size={32} strokeWidth={1.4} />
          )}
          {/* Bottom fade blends image edge into the card */}
          <div className="absolute bottom-0 inset-x-0 h-10 pointer-events-none"
            style={{ background: 'linear-gradient(to top, #0e0c10 0%, transparent 100%)' }} />
        </div>
        <div className="px-2.5 py-2">
          <div className="text-oneui-cap font-semibold text-fog-100 truncate">{item.name}</div>
          <div className="text-[11px] text-fog-400 truncate">
            {item.category?.name ?? '—'} {item.fit ? `· ${item.fit}` : ''}
          </div>
        </div>
      </Squircle>
    </Link>
  );
}
