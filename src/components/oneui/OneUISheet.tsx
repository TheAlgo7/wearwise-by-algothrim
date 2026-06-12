'use client';

import { cn } from '@/lib/cn';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface OneUISheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  'aria-label'?: string;
  children: ReactNode;
  className?: string;
}

export function OneUISheet({ open, onClose, title, 'aria-label': ariaLabel, children, className }: OneUISheetProps) {
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

  // Focus trap — keeps keyboard navigation inside the dialog
  const trapRef = useFocusTrap(open);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      {/* Backdrop — no backdrop-blur (GPU cost on mid-range Android; dark overlay is sufficient) */}
      <div
        className="absolute inset-0 bg-black/75 animate-oneui-fade"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={trapRef}
        className={cn(
          'relative w-full max-w-xl max-h-[calc(100dvh-24px)] overflow-y-auto rounded-t-[32px] border border-b-0 border-white/[0.08] shadow-oneui-raised pb-[env(safe-area-inset-bottom)] animate-oneui-pop',
          className
        )}
        style={{
          // One UI 9 glass: translucent floating surface, dimmed page bleeds through
          background: 'rgba(18,16,18,0.84)',
          backdropFilter: 'blur(32px) saturate(160%)',
          WebkitBackdropFilter: 'blur(32px) saturate(160%)',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'oneui-sheet-title' : undefined}
        aria-label={!title ? ariaLabel : undefined}
      >
        {/* grabber — One UI 9 chunkier handle */}
        <div className="pt-2.5 pb-1 flex justify-center">
          <div className="h-1.5 w-12 rounded-full bg-white/25" />
        </div>
        {title ? (
          <div className="flex items-center justify-between px-5 pt-1 pb-3">
            <h2 id="oneui-sheet-title" className="text-oneui-h text-fog-100">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="press h-11 w-11 rounded-full bg-white/[0.08] flex items-center justify-center text-fog-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            >
              <X size={18} />
            </button>
          </div>
        ) : null}
        <div className="px-5 pb-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}
