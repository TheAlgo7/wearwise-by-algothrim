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
        isMode ? 'h-11 px-5 text-[14px]' : 'h-9 px-4 text-[13px]',
        active
          ? 'bg-crimson-400 text-white border-transparent'
          : 'bg-white/[0.08] text-fog-200 border-white/[0.08] hover:bg-white/[0.12] hover:text-crimson-50',
        className
      )}
    >
      {leftIcon}
      <span>{children}</span>
    </button>
  );
}
