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

// Revamp, Nov 2026: hairline groups on the black canvas, not grey boxes (see .app-card).
const variantMap = {
  flat: 'bg-white/[0.025] border border-white/[0.08]',
  raised: 'bg-white/[0.04] border border-white/[0.10] shadow-card',
  glass: 'bg-transparent border border-white/[0.08]',
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
