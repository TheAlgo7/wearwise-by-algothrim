'use client';

import { cn } from '@/lib/cn';
import { Scissors } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Status {
  enabled: boolean;
  hairstyleGoal: string | null;
  growthDays: number | null;
  next: Array<{ key: string; label: string; inDays: number | null; detail: string }>;
}

/**
 * What Ishita sees of his grooming.
 *
 * Timing only: when the next shave, trim and haircut fall. No products, no
 * routine, no logs. He turned this on deliberately, and it stays this narrow
 * whether or not he ever looks at the toggle again.
 */
export function GroomingCard() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      const r = await fetch('/api/grooming-status', { signal: controller.signal }).catch(() => null);
      if (!r?.ok || controller.signal.aborted) return;
      setStatus((await r.json()) as Status);
    })();
    return () => controller.abort();
  }, []);

  if (!status?.enabled || status.next.length === 0) return null;

  return (
    <section aria-label="His grooming" className="app-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold leading-5 text-fog-100">
          <Scissors size={14} className="text-crimson-300" aria-hidden />
          His grooming
        </h2>
        {status.growthDays !== null && (
          <span className="shrink-0 text-[12px] font-medium text-fog-400">
            {status.growthDays}d growing out
          </span>
        )}
      </div>

      {status.hairstyleGoal && (
        <p className="mt-1 text-[12px] leading-5 text-fog-400 text-pretty">{status.hairstyleGoal}</p>
      )}

      <ul className="mt-3 flex flex-col gap-2">
        {status.next.slice(0, 4).map((n) => {
          const overdue = n.inDays !== null && n.inDays < 0;
          const today = n.inDays === 0;
          return (
            <li key={n.key} className="flex items-baseline justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-fog-200">{n.label}</span>
                <span className="block truncate text-[11px] text-fog-500">{n.detail}</span>
              </span>
              <span
                className={cn(
                  'shrink-0 text-[12px] font-semibold',
                  overdue || today ? 'text-crimson-300' : 'text-fog-400'
                )}
              >
                {n.inDays === null ? '—'
                  : overdue ? `${Math.abs(n.inDays)}d over`
                  : today ? 'Today'
                  : n.inDays === 1 ? 'Tomorrow'
                  : `in ${n.inDays}d`}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
