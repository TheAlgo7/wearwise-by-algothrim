'use client';

import { cn } from '@/lib/cn';
import type { CareStep } from '@/lib/care/types';
import { AlertTriangle, Check, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface Props {
  step: CareStep;
  order: number;
  done: boolean;
  busy: boolean;
  onDone: () => void;
  onSkip: () => void;
  onUndo: () => void;
}

/**
 * One step, one line, one tap.
 *
 * The first version gave each step a full-width Done button and a Skip beside
 * it. On a wash day that is seven stacked cards of about 200px each, so the
 * routine became a scroll — and seven solid action buttons undid the whole
 * crimson-restraint pass in one screen. Marking a step done is now the circle
 * on the right, which is a 48px target and reads as a checklist should.
 *
 * "Why this step" stays collapsed. The reasoning is what makes this more than
 * a checklist he ignores, but he does not need to read it every morning.
 */
export function RoutineStep({ step, order, done, busy, onDone, onSkip, onUndo }: Props) {
  const [whyOpen, setWhyOpen] = useState(false);

  return (
    <li className={cn('app-card px-4 py-3 transition-opacity', done && 'opacity-55')}>
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold',
            done ? 'text-crimson-300' : 'bg-white/[0.07] text-fog-400'
          )}
        >
          {done ? <Check size={14} strokeWidth={3} /> : order}
        </span>

        <div className="min-w-0 flex-1">
          <h3 className={cn('truncate text-[15px] font-semibold leading-5 text-fog-100', done && 'line-through')}>
            {step.title}
            {step.optional && !done && (
              <span className="ml-2 align-middle text-[11px] font-medium text-fog-400">optional</span>
            )}
          </h3>
          {(step.productName || step.detail) && (
            <p className="mt-0.5 truncate text-[12px] text-fog-400">
              {[step.productName, step.detail].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={done ? onUndo : onDone}
          disabled={busy}
          aria-pressed={done}
          aria-label={done ? `Undo ${step.title}` : `Mark ${step.title} done`}
          className={cn(
            'press flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400 disabled:opacity-50',
            done
              ? 'bg-crimson-400 text-white'
              : 'border border-white/[0.14] text-transparent hover:border-crimson-400/60 hover:text-crimson-400/40'
          )}
        >
          <Check size={20} strokeWidth={2.8} aria-hidden />
        </button>
      </div>

      {step.missing && (
        <p className="mt-2.5 flex items-start gap-2 rounded-squircle-sm bg-white/[0.05] px-3 py-2 text-[12px] leading-5 text-fog-200">
          <AlertTriangle size={13} className="mt-0.5 shrink-0 text-crimson-300" aria-hidden />
          {step.missing}
        </p>
      )}

      <div className="mt-1 flex items-center gap-1">
        <button
          type="button"
          onClick={() => setWhyOpen((v) => !v)}
          aria-expanded={whyOpen}
          className="press inline-flex min-h-[40px] items-center gap-1 rounded-full pr-2 text-[12px] font-semibold text-fog-400 transition-colors hover:text-fog-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
        >
          Why this step
          <ChevronDown
            size={13}
            aria-hidden
            className="transition-transform duration-200"
            style={{ transform: whyOpen ? 'rotate(180deg)' : undefined }}
          />
        </button>
        {!done && (
          <button
            type="button"
            onClick={onSkip}
            disabled={busy}
            className="press ml-auto inline-flex min-h-[40px] items-center rounded-full px-2 text-[12px] font-semibold text-fog-500 transition-colors hover:text-fog-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400 disabled:opacity-50"
          >
            Skip
          </button>
        )}
      </div>

      {whyOpen && (
        <p className="animate-oneui-fade pb-1 text-[13px] leading-[1.55] text-fog-300 text-pretty">
          {step.why}
        </p>
      )}
    </li>
  );
}
