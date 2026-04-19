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
      onClick={onClick}
      className={cn(
        'press shrink-0 inline-flex items-center gap-2 rounded-full font-semibold border transition-colors',
        isMode ? 'h-11 px-5 text-[14px]' : 'h-9 px-4 text-[13px]',
        active
          ? 'bg-crimson-gradient text-white border-transparent shadow-crimson-glow'
          : 'bg-ink-100 text-fog-200 border-white/[0.06] hover:text-fog-100 hover:bg-ink-200',
        className
      )}
    >
      {leftIcon}
      <span>{children}</span>
    </button>
  );
}
