'use client';

import { cn } from '@/lib/cn';
import type { CareLog, DueItem } from '@/lib/care/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';

interface Props {
  logs: CareLog[];
  due: DueItem[];
}

/** Only the things worth marking a date for. Cleansing every day is not one. */
const TRACKED: Record<string, { label: string; tone: 'hair' | 'body' | 'skin' }> = {
  haircut: { label: 'Haircut', tone: 'hair' },
  hair_spa: { label: 'Hair spa', tone: 'hair' },
  shave: { label: 'Shave', tone: 'body' },
  trim: { label: 'Trim', tone: 'body' },
  reaction: { label: 'Reaction', tone: 'skin' },
};

const TONE: Record<string, string> = {
  hair: 'bg-crimson-300',
  body: 'bg-fog-200',
  skin: 'bg-crimson-500',
  due: 'bg-white/30',
};

const IST = 'Asia/Kolkata';

function istKey(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: IST, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
}

/**
 * A month at a glance.
 *
 * Past grooming comes from the logs, upcoming from the same due dates the
 * routine screen uses, so there is one source of truth and the calendar can
 * never disagree with "Next up".
 */
export function CareCalendar({ logs, due }: Props) {
  const [offset, setOffset] = useState(0);

  // Read the clock once, outside the memo: the lint rule is right that a memo
  // body should be pure, and one timestamp for the whole render is also what
  // keeps the grid and the list agreeing about which day is "today".
  const [now] = useState(() => new Date());

  const { label, cells, events } = useMemo(() => {
    const base = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const year = base.getFullYear();
    const month = base.getMonth();

    // Monday-first grid.
    const first = new Date(year, month, 1);
    const lead = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const byDay = new Map<string, Array<{ label: string; tone: string; future: boolean }>>();

    for (const l of logs) {
      const meta = TRACKED[l.action];
      if (!meta) continue;
      const key = istKey(new Date(l.done_at));
      const list = byDay.get(key) ?? [];
      list.push({ label: l.area ? `${meta.label} · ${l.area}` : meta.label, tone: meta.tone, future: false });
      byDay.set(key, list);
    }

    for (const d of due) {
      if (d.inDays === null || d.inDays < 0) continue;
      const when = new Date(now.getTime() + d.inDays * 86_400_000);
      const key = istKey(when);
      const list = byDay.get(key) ?? [];
      list.push({ label: d.label, tone: 'due', future: true });
      byDay.set(key, list);
    }

    const todayKey = istKey(now);
    const cells: Array<{ day: number | null; key: string; isToday: boolean; dots: string[] }> = [];
    for (let i = 0; i < lead; i++) cells.push({ day: null, key: `lead-${i}`, isToday: false, dots: [] });
    for (let day = 1; day <= daysInMonth; day++) {
      const key = istKey(new Date(year, month, day, 12));
      const dots = Array.from(new Set((byDay.get(key) ?? []).map((e) => e.tone)));
      cells.push({ day, key, isToday: key === todayKey, dots });
    }

    // Everything in this month, in date order, for the list under the grid.
    const events = [...byDay.entries()]
      .filter(([k]) => k.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, list]) => ({ key: k, list }));

    return {
      label: base.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
      cells,
      events,
    };
  }, [logs, due, offset, now]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOffset((o) => o - 1)}
          aria-label="Previous month"
          className="press flex h-11 w-11 items-center justify-center rounded-full text-fog-300 transition-colors hover:bg-white/[0.06] hover:text-fog-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
        >
          <ChevronLeft size={18} aria-hidden />
        </button>
        <h2 className="text-[16px] font-semibold text-fog-100">{label}</h2>
        <button
          type="button"
          onClick={() => setOffset((o) => o + 1)}
          aria-label="Next month"
          className="press flex h-11 w-11 items-center justify-center rounded-full text-fog-300 transition-colors hover:bg-white/[0.06] hover:text-fog-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
        >
          <ChevronRight size={18} aria-hidden />
        </button>
      </div>

      <div className="app-card p-3">
        <div className="mb-1 grid grid-cols-7 gap-1">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <span key={i} className="text-center text-[11px] font-semibold text-fog-500">{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((c) => (
            <div
              key={c.key}
              className={cn(
                'flex aspect-square flex-col items-center justify-center gap-1 rounded-[12px]',
                c.isToday && 'bg-crimson-400/[0.16]'
              )}
            >
              {c.day !== null && (
                <>
                  <span className={cn('text-[13px]', c.isToday ? 'font-bold text-crimson-200' : 'text-fog-300')}>
                    {c.day}
                  </span>
                  <span className="flex h-1.5 items-center gap-0.5">
                    {c.dots.slice(0, 3).map((t) => (
                      <span key={t} className={cn('h-1.5 w-1.5 rounded-full', TONE[t])} />
                    ))}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {events.length === 0 ? (
        <p className="px-1 py-4 text-center text-[13px] text-fog-400">Nothing logged or due this month.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {events.map(({ key, list }) => {
            const d = new Date(`${key}T12:00:00+05:30`);
            return (
              <li key={key} className="app-card flex gap-3 p-3.5">
                <span className="flex w-11 shrink-0 flex-col items-center">
                  <span className="text-[11px] font-medium uppercase text-fog-500">
                    {d.toLocaleDateString('en-IN', { weekday: 'short' })}
                  </span>
                  <span className="text-[17px] font-semibold text-fog-100">{d.getDate()}</span>
                </span>
                <span className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                  {list.map((e, i) => (
                    <span key={i} className="flex items-center gap-2">
                      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', TONE[e.tone])} />
                      <span className={cn('truncate text-[13px]', e.future ? 'text-fog-400' : 'text-fog-200')}>
                        {e.label}
                        {e.future && <span className="ml-1.5 text-[11px] text-fog-500">due</span>}
                      </span>
                    </span>
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
