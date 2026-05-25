'use client';

import { cn } from '@/lib/cn';
import { Loader2, Sparkles } from 'lucide-react';

interface Props {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export function GenerateButton({ onClick, loading, disabled, label = 'Generate Fit', className }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      aria-busy={loading}
      className={cn(
        'press w-full h-14 rounded-full bg-crimson-400 text-white',
        'flex items-center justify-center gap-2.5 text-[16px] font-semibold tracking-tight',
        'transition-colors duration-200 hover:bg-crimson-500',
        'disabled:opacity-40 disabled:pointer-events-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-100',
        className
      )}
    >
      {loading ? (
        <>
          <Loader2 className="animate-spin" size={20} />
          <span>Styling you…</span>
        </>
      ) : (
        <>
          <Sparkles size={20} strokeWidth={2.2} />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
