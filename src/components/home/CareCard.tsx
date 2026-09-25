'use client';

import { cn } from '@/lib/cn';
import type { CarePlan } from '@/lib/care/types';
import { Check, ChevronRight, Moon, Sun } from 'lucide-react';
import Link from 'next/link';

interface Props {
  plan: CarePlan | null;
  loading: boolean;
}

/**
 * One line between the context pill and the outfit.
 *
 * It used to be a card: a heading, a meta line, a truncated list of every step
 * and a chip row. That was four lines of skincare above the outfit, and it was
 * the card that pushed "Wear this" below the fold. The step list lives on the
 * Care screen, one tap away; here it only has to say that there is a routine,
 * how long it takes, and the one thing that is actually unusual today.
 */
export function CareCard({ plan, loading }: Props) {
  if (loading || !plan) return null;

  const done = new Set(plan.doneKeys);
  const remaining = plan.steps.filter((s) => !done.has(s.key));
  const evening = plan.phase === 'evening';
  const phaseWord = evening ? 'Evening' : 'Morning';

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

  // Exceptions only. "Wash day" is already obvious from the routine itself.
  const flag = plan.flags.find((f) => f !== 'Wash day') ?? null;
  // Something genuinely due today. Stale dates (nothing logged in weeks) are
  // not due, they are unknown, and they do not get to shout from the home screen.
  const pressing = plan.due.find((d) => !d.stale && d.inDays !== null && d.inDays <= 0) ?? null;
  const note = flag ?? (pressing ? `${pressing.label} due` : null);
  const Icon = evening ? Moon : Sun;

  return (
    <Link
      href="/care"
      aria-label={`${phaseWord} care, ${remaining.length} steps, about ${Math.round(plan.minutes)} minutes${note ? `. ${note}` : ''}`}
      className={cn(
        'press app-card flex min-h-[52px] items-center gap-3 rounded-[18px] px-4',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400'
      )}
    >
      <Icon size={16} className="shrink-0 text-fog-300" aria-hidden />
      <span className="min-w-0 flex-1 truncate text-[14px]">
        <span className="font-semibold text-fog-100">{phaseWord} care</span>
        <span className="text-fog-400">
          {' '}· {remaining.length} {remaining.length === 1 ? 'step' : 'steps'} · {Math.round(plan.minutes)} min
        </span>
      </span>
      {note && (
        <span className="max-w-[46%] shrink-0 truncate rounded-full bg-crimson-400/[0.14] px-2.5 py-1 text-[11px] font-semibold text-crimson-100">
          {note}
        </span>
      )}
      <ChevronRight size={16} className="-mr-1 shrink-0 text-fog-400" aria-hidden />
    </Link>
  );
}
