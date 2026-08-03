'use client';

import { cn } from '@/lib/cn';
import { SEASONS, SEASON_META, seasonSourceLabel, type Season } from '@/lib/season';
import { RotateCcw } from 'lucide-react';

interface Props {
  season: Season;
  source: 'manual' | 'weather' | 'calendar';
  override: Season | null;
  onToggle: (s: Season) => void;
  onReset: () => void;
  /** Shown alongside the source line so the auto choice is explainable. */
  tempC?: number | null;
  className?: string;
}

const DOT: Record<Season, string> = {
  summer: 'bg-season-summer',
  monsoon: 'bg-season-monsoon',
  autumn: 'bg-season-autumn',
  winter: 'bg-season-winter',
};

export function SeasonSwitch({ season, source, override, onToggle, onReset, tempC, className }: Props) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="text-oneui-cap font-semibold uppercase tracking-widest text-crimson-300">Season</p>
        {override ? (
          <button
            type="button"
            onClick={onReset}
            className="press inline-flex min-h-8 items-center gap-1.5 rounded-full px-2 text-[11px] font-semibold text-crimson-100/60 transition-colors hover:text-crimson-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
          >
            <RotateCcw size={12} aria-hidden />
            Back to auto
          </button>
        ) : (
          <p className="text-[11px] font-medium text-fog-400">
            {seasonSourceLabel(source)}
            {source === 'weather' && typeof tempC === 'number' ? ` · ${Math.round(tempC)}°` : ''}
          </p>
        )}
      </div>

      {/* Segmented control. One row, always four, no scrolling. */}
      <div
        role="radiogroup"
        aria-label="Season"
        className="grid grid-cols-4 gap-1 rounded-full bg-white/[0.05] p-1"
      >
        {SEASONS.map((s) => {
          const active = season === s;
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onToggle(s)}
              className={cn(
                'press flex min-h-[42px] items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400',
                active ? 'bg-crimson-400 text-white' : 'text-fog-300 hover:text-fog-100'
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'h-1.5 w-1.5 shrink-0 rounded-full transition-opacity',
                  DOT[s],
                  active ? 'opacity-0' : 'opacity-90'
                )}
              />
              {SEASON_META[s].label}
            </button>
          );
        })}
      </div>

      <p className="px-1 text-[12px] leading-5 text-fog-400">{SEASON_META[season].hint}</p>
    </div>
  );
}
