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
        'press shrink-0 inline-flex items-center gap-2 rounded-full font-semibold border transition-all duration-200',
        isMode ? 'h-11 px-5 text-[14px]' : 'h-9 px-4 text-[13px]',
        active
          ? 'bg-gradient-to-r from-[#E2335D] to-[#BB165F] text-white border-transparent shadow-crimson-glow'
          : 'bg-white/[0.06] backdrop-blur-sm text-[#FFD9DA] border-white/[0.1] hover:bg-white/[0.1] hover:text-[#FFEDE8]',
        className
      )}
    >
      {leftIcon}
      <span>{children}</span>
    </button>
  );
}
