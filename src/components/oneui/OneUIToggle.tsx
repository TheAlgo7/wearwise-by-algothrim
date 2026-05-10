'use client';

import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

interface OneUIToggleProps {
  options: { value: string; label: string; icon?: ReactNode }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  size?: 'sm' | 'md';
  'aria-label'?: string;
}

export function OneUIToggle({
  options,
  value,
  onChange,
  className,
  size = 'md',
  'aria-label': ariaLabel,
}: OneUIToggleProps) {
  const pad = size === 'sm' ? 'h-10 text-[13px]' : 'h-12 text-[14px]';
  return (
    <div
      className={cn(
        'grid bg-white/[0.07] border border-white/[0.06] p-1 rounded-full gap-1',
        className
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
      role="radiogroup"
      aria-label={ariaLabel ?? 'Toggle'}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'press rounded-full font-semibold flex items-center justify-center gap-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent',
              pad,
              active
                ? 'bg-crimson-400 text-white'
                : 'text-fog-300 hover:text-fog-100'
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
