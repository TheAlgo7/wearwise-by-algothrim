'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

const buttonStyles = cva(
  'press inline-flex items-center justify-center gap-2 font-semibold tracking-tight select-none outline-none disabled:opacity-40 disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-[#E2335D] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
  {
    variants: {
      intent: {
        primary:   'bg-gradient-to-r from-[#E2335D] to-[#BB165F] text-white shadow-crimson-glow hover:brightness-110',
        secondary: 'bg-white/[0.08] backdrop-blur-xl text-[#FFEDE8] border border-white/[0.1] hover:bg-white/[0.12]',
        ghost:     'bg-transparent text-[#FFD9DA] hover:bg-white/[0.07]',
        outline:   'bg-transparent text-[#FFEDE8] border border-white/[0.15] hover:bg-white/[0.07]',
        danger:    'bg-gradient-to-r from-[#E2335D] to-[#8B0F47] text-white hover:brightness-110',
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
