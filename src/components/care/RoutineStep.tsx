'use client';

import { cn } from '@/lib/cn';
import type { CareStep } from '@/lib/care/types';
import { AlertTriangle } from 'lucide-react';

interface Props {
  step: CareStep;
  order: number;
  /** Dimmed and non-interactive: this is the routine you are not in right now. */
  muted?: boolean;
}

/**
 * One step, written out.
 *
 * This used to be a checklist with a tick circle per step. That was wrong: he
 * does not want to mark washing his face as complete every morning, and being
 * asked to turns a reference into a chore with an unfinished state. It is a
 * reference now. Read it, do it, close the app.
 *
 * The reasoning is inline rather than behind a "why this step" toggle, because
 * nothing here is long enough to need hiding once the buttons are gone.
 */
export function RoutineStep({ step, order, muted }: Props) {
  return (
    <li className={cn('flex gap-3', muted && 'opacity-70')}>
      <span
        aria-hidden
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-[11px] font-semibold text-fog-400"
      >
        {order}
      </span>

      <div className="min-w-0 flex-1 pb-3">
        <h3 className="text-[15px] font-semibold leading-5 text-fog-100">
          {step.title}
          {step.optional && (
            <span className="ml-2 align-middle text-[11px] font-medium text-fog-400">if needed</span>
          )}
        </h3>

        {(step.productName || step.detail) && (
          <p className="mt-0.5 text-[13px] leading-5 text-fog-300">
            {[step.productName, step.detail].filter(Boolean).join(' · ')}
          </p>
        )}

        <p className="mt-1 text-[12px] leading-[1.5] text-fog-400 text-pretty">{step.why}</p>

        {step.missing && (
          <p className="mt-2 flex items-start gap-2 rounded-squircle-sm bg-white/[0.05] px-3 py-2 text-[12px] leading-5 text-fog-200">
            <AlertTriangle size={13} className="mt-0.5 shrink-0 text-crimson-300" aria-hidden />
            {step.missing}
          </p>
        )}
      </div>
    </li>
  );
}
