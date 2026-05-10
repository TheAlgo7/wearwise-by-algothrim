import { cn } from '@/lib/cn';
import type { HTMLAttributes, ReactNode } from 'react';

interface SquircleProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'flat' | 'raised' | 'glass';
  radius?: 'sm' | 'md' | 'lg' | 'xl';
  children: ReactNode;
}

const radiusMap = {
  sm: 'rounded-[14px]',
  md: 'rounded-[20px]',
  lg: 'rounded-[26px]',
  xl: 'rounded-[32px]',
} as const;

const variantMap = {
  flat: 'bg-ink-200 border border-white/[0.05]',
  raised: 'bg-ink-200 border border-white/[0.07] shadow-card',
  glass: 'bg-white/[0.04] border border-white/[0.06]',
} as const;

export function Squircle({ variant = 'flat', radius = 'md', className, children, ...rest }: SquircleProps) {
  return (
    <div
      className={cn(variantMap[variant], radiusMap[radius], className)}
      {...rest}
    >
      {children}
    </div>
  );
}
