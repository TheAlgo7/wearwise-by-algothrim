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

export function Squircle({ variant: _v = 'flat', radius = 'md', className, children, ...rest }: SquircleProps) {
  return (
    <div
      className={cn('bg-[#1A1819] border border-white/[0.05]', radiusMap[radius], className)}
      {...rest}
    >
      {children}
    </div>
  );
}
