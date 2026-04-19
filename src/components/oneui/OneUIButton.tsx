'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

const buttonStyles = cva(
  'press inline-flex items-center justify-center gap-2 font-semibold tracking-tight select-none outline-none disabled:opacity-40 disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-crimson-200 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-0',
  {
    variants: {
      intent: {
        primary:  'bg-crimson-gradient text-white shadow-crimson-glow hover:brightness-110',
        secondary:'bg-ink-200 text-fog-100 hover:bg-ink-300',
        ghost:    'bg-transparent text-fog-200 hover:bg-ink-100',
        outline:  'bg-transparent text-fog-100 border border-white/10 hover:bg-ink-100',
        danger:   'bg-crimson-700 text-white hover:bg-crimson-600',
      },
      size: {
        sm: 'h-10 px-4 text-[14px] rounded-squircle-sm',
        md: 'h-12 px-5 text-[15px] rounded-squircle',
        lg: 'h-14 px-6 text-[16px] rounded-squircle',
        xl: 'h-16 px-7 text-[17px] rounded-squircle-lg',
        icon: 'h-11 w-11 rounded-full p-0',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: { intent: 'primary', size: 'md' },
  }
);

export interface OneUIButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonStyles> {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const OneUIButton = forwardRef<HTMLButtonElement, OneUIButtonProps>(
  ({ intent, size, fullWidth, leftIcon, rightIcon, className, children, ...rest }, ref) => (
    <button
      ref={ref}
      className={cn(buttonStyles({ intent, size, fullWidth }), className)}
      {...rest}
    >
      {leftIcon}
      <span>{children}</span>
      {rightIcon}
    </button>
  )
);
OneUIButton.displayName = 'OneUIButton';
