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
        'grid bg-ink-100 p-1 rounded-squircle shadow-oneui-card gap-0',
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
              'press rounded-squircle-sm font-semibold flex items-center justify-center gap-2 transition-colors',
              pad,
              active
                ? 'bg-crimson-gradient text-white shadow-crimson-glow'
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
