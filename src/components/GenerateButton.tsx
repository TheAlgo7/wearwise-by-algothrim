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
        'press w-full h-14 rounded-full bg-[#E2335D] text-white',
        'flex items-center justify-center gap-2.5 text-[16px] font-semibold tracking-tight',
        'transition-colors duration-200 hover:bg-[#BB165F]',
        'disabled:opacity-40 disabled:pointer-events-none',
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
