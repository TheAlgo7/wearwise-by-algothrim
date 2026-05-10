'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

const buttonStyles = cva(
  'press inline-flex items-center justify-center gap-2 font-semibold tracking-tight select-none outline-none disabled:opacity-40 disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-crimson-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
  {
    variants: {
      intent: {
        primary:   'bg-crimson-400 text-white transition-colors duration-200 hover:bg-crimson-500',
        secondary: 'bg-white/[0.08] text-crimson-50 border border-white/[0.08] transition-colors duration-200 hover:bg-white/[0.13]',
        ghost:     'bg-transparent text-crimson-100 transition-colors duration-200 hover:bg-white/[0.07]',
        outline:   'bg-transparent text-crimson-50 border border-white/[0.12] transition-colors duration-200 hover:bg-white/[0.07]',
        danger:    'bg-error text-error-text transition-colors duration-200 hover:bg-error/80',
      },
      size: {
        sm:   'h-10 px-4 text-[14px] rounded-full',
        md:   'h-12 px-5 text-[15px] rounded-full',
        lg:   'h-14 px-6 text-[16px] rounded-full',
        xl:   'h-16 px-7 text-[17px] rounded-full',
        icon: 'h-11 w-11 rounded-full p-0',
      },
      fullWidth: { true: 'w-full' },
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
