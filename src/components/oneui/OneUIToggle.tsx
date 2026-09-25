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
      className={cn('seg', className)}
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
            className={cn('seg-item', pad)}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
