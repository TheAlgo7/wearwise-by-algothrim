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
        active
          ? 'bg-crimson-400 text-white border-transparent'
          : 'bg-white/[0.06] text-fog-200 border-white/[0.08] hover:bg-white/[0.10] hover:text-fog-100',
        className
      )}
    >
      {leftIcon}
      <span>{children}</span>
    </button>
  );
}
