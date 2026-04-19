'use client';

import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

interface OneUIToggleProps {
  options: { value: string; label: string; icon?: ReactNode }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function OneUIToggle({
  options,
  value,
  onChange,
  className,
  size = 'md',
}: OneUIToggleProps) {
  const pad = size === 'sm' ? 'h-10 text-[13px]' : 'h-12 text-[14px]';
  return (
    <div
      className={cn(
        'grid bg-white/[0.07] border border-white/[0.06] p-1 rounded-full gap-1',
        className
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
      role="tablist"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'press rounded-full font-semibold flex items-center justify-center gap-2 transition-all duration-200',
              pad,
              active
                ? 'bg-[#E2335D] text-white'
                : 'text-[#A89098] hover:text-[#FFEDE8]'
            )}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
