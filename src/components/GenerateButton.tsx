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
      className={cn(
        'press relative w-full h-16 rounded-squircle-lg bg-crimson-gradient shadow-crimson-glow text-white',
        'flex items-center justify-center gap-2.5 text-[17px] font-bold tracking-tight',
        'disabled:opacity-50 disabled:pointer-events-none',
        !loading && 'crimson-pulse',
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
          <Sparkles size={20} strokeWidth={2.4} />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
