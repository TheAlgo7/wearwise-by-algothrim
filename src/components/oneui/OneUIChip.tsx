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
          ? 'bg-[#E2335D] text-white border-transparent'
          : 'bg-white/[0.08] text-[#D9C8CC] border-white/[0.08] hover:bg-white/[0.12] hover:text-[#FFEDE8]',
        className
      )}
    >
      {leftIcon}
      <span>{children}</span>
    </button>
  );
}
