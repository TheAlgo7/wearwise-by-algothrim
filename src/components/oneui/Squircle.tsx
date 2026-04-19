import { cn } from '@/lib/cn';
import type { HTMLAttributes, ReactNode } from 'react';

interface SquircleProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'flat' | 'raised' | 'glass';
  radius?: 'sm' | 'md' | 'lg' | 'xl';
  children: ReactNode;
}

const radiusMap = {
  sm: 'rounded-squircle-sm',
  md: 'rounded-squircle',
  lg: 'rounded-squircle-lg',
  xl: 'rounded-squircle-xl',
} as const;

const variantMap = {
  flat:   'bg-ink-100 shadow-oneui-card',
  raised: 'bg-ink-200 shadow-oneui-raised',
  glass:  'bg-ink-200/60 backdrop-blur-xl shadow-oneui-card border border-white/[0.04]',
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
