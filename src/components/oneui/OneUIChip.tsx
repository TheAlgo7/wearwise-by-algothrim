'use client';

import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

interface OneUIChipProps {
  active?: boolean;
  onClick?: () => void;
  leftIcon?: ReactNode;
  className?: string;
  children: ReactNode;
  variant?: 'filter' | 'mode';
}

export function OneUIChip({
  active = false,
  onClick,
  leftIcon,
  className,
  children,
  variant = 'filter',
}: OneUIChipProps) {
  const isMode = variant === 'mode';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'press shrink-0 inline-flex items-center gap-2 rounded-full font-semibold border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400',
        // 48px / 44px. Android's guidance is a 48dp minimum touch target; the
        // filter row sits at 44 so a scrolling row of them does not eat the screen.
        isMode ? 'h-12 px-5 text-[14px]' : 'h-11 px-4 text-[13px]',
        // Selected is a raised neutral, the same as a chosen segment. A filter
        // narrows a view; it is not a decision, so it does not get the accent.
        active
          ? 'bg-ink-500 text-fog-100 border-white/[0.16] shadow-[0_1px_0_rgb(255_255_255/0.07)_inset,0_2px_10px_rgb(0_0_0/0.35)]'
          : 'bg-white/[0.04] text-fog-300 border-white/[0.08] hover:bg-white/[0.08] hover:text-fog-100',
        className
      )}
    >
      {leftIcon}
      <span>{children}</span>
    </button>
  );
}
