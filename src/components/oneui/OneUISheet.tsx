'use client';

import { cn } from '@/lib/cn';
import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

interface OneUISheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function OneUISheet({ open, onClose, title, children, className }: OneUISheetProps) {
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-oneui-fade"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cn(
          'relative w-full max-w-xl bg-ink-100 rounded-t-squircle-xl shadow-oneui-raised pb-[env(safe-area-inset-bottom)] animate-oneui-pop',
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* grabber */}
        <div className="pt-2 pb-1 flex justify-center">
          <div className="h-1 w-10 rounded-full bg-fog-500/50" />
        </div>
        {title ? (
          <div className="flex items-center justify-between px-5 pt-1 pb-3">
            <h2 className="text-oneui-h text-fog-100">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="press h-9 w-9 rounded-full bg-ink-200 flex items-center justify-center text-fog-200"
            >
              <X size={18} />
            </button>
          </div>
        ) : null}
        <div className="px-5 pb-6">{children}</div>
      </div>
    </div>
  );
}
