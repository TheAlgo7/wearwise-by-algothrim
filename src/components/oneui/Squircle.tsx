import { cn } from '@/lib/cn';
import type { HTMLAttributes, ReactNode } from 'react';

interface SquircleProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'flat' | 'raised' | 'glass';
  radius?: 'sm' | 'md' | 'lg' | 'xl';
  children: ReactNode;
}

const radiusMap = {
  sm: 'rounded-[1.5rem]',
  md: 'rounded-[2rem]',
  lg: 'rounded-[2.5rem]',
  xl: 'rounded-[3rem]',
} as const;

const variantMap = {
  flat:   'bg-white/[0.05] backdrop-blur-xl border border-white/[0.07] shadow-glass-card',
  raised: 'bg-white/[0.07] backdrop-blur-2xl border border-white/[0.1] shadow-glass-card',
  glass:  'bg-white/[0.06] backdrop-blur-2xl border border-white/[0.09] shadow-glass-card',
} as const;

export function Squircle({
  variant = 'flat',
  radius = 'md',
  className,
  children,
  ...rest
}: SquircleProps) {
  return (
    <div
      className={cn(variantMap[variant], radiusMap[radius], className)}
      {...rest}
    >
      {children}
    </div>
  );
}
