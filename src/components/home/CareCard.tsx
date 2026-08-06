'use client';

import { cn } from '@/lib/cn';
import type { CarePlan } from '@/lib/care/types';
import { Check, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface Props {
  plan: CarePlan | null;
  loading: boolean;
}

/**
 * One card, between the context pill and the outfit.
 *
 * The outfit stays the visual hero: this is a line of text and a link, not ten
 * skincare tiles. Once the routine is done it collapses to a single line, so
 * the reward for finishing is less screen, not a streak counter.
 */
export function CareCard({ plan, loading }: Props) {
  if (loading || !plan) return null;

  const done = new Set(plan.doneKeys);
  const remaining = plan.steps.filter((s) => !done.has(s.key));
  const phaseWord = plan.phase === 'evening' ? 'Evening' : 'Morning';

  if (remaining.length === 0) {
    return (
      <Link
        href="/care"
        className="press flex min-h-[48px] items-center gap-2 rounded-full px-1 text-[13px] font-medium text-fog-400 transition-colors hover:text-fog-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
      >
        <Check size={15} className="text-crimson-300" aria-hidden />
        {phaseWord} care done
      </Link>
    );
  }

  // The soonest thing that is overdue or due today, if there is one.
  const pressing = plan.due.find((d) => d.inDays !== null && d.inDays <= 0);

  /**
   * Chips are for exceptions, not for facts already visible.
   *
   * "Wash day" earned a chip in the first version, directly above a step list
   * that reads "… Shampoo · Condition". That is the same information twice,
   * and the row it cost pushed "Wear this" back under the nav bar.
   */
  const notable = plan.flags.filter((f) => f !== 'Wash day');

  return (
    <Link
      href="/care"
      className={cn(
        'press app-card block p-4',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400'
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold leading-5 text-fog-100">Care now</h2>
        <span className="flex shrink-0 items-center gap-1 text-[12px] font-medium text-fog-400">
          {phaseWord} · {remaining.length} {remaining.length === 1 ? 'step' : 'steps'} · {plan.minutes} min
          <ChevronRight size={14} aria-hidden />
        </span>
      </div>

      <p className="mt-1.5 truncate text-[13px] text-fog-300">
        {remaining.map((s) => s.title).join(' · ')}
      </p>

      {(pressing || notable.length > 0) && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {notable.map((f) => (
            <span
              key={f}
              className="inline-flex items-center rounded-full bg-crimson-400/[0.14] px-2.5 py-1 text-[11px] font-semibold text-crimson-200"
            >
              {f}
            </span>
          ))}
          {pressing && (
            <span className="inline-flex items-center rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-fog-300">
              {pressing.label} due
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
