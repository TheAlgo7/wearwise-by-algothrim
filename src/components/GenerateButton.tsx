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
        'press relative w-full h-16 rounded-full text-white',
        'flex items-center justify-center gap-3 text-[17px] font-bold tracking-tight',
        'disabled:opacity-50 disabled:pointer-events-none',
        !loading && 'crimson-pulse',
        className
      )}
      style={{
        background: 'linear-gradient(135deg, #E2335D 0%, #BB165F 100%)',
        boxShadow: '0 0 32px rgba(226,51,93,0.5), 0 4px 24px rgba(0,0,0,0.3)',
      }}
    >
      {/* subtle inner highlight */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 60%)' }}
      />
      {loading ? (
        <>
          <Loader2 className="animate-spin relative" size={22} />
          <span className="relative">Styling you…</span>
        </>
      ) : (
        <>
          <Sparkles size={22} strokeWidth={2.4} className="relative" />
          <span className="relative">{label}</span>
        </>
      )}
    </button>
  );
}
