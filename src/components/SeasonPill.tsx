'use client';

import { OneUISheet } from '@/components/oneui';
import { cn } from '@/lib/cn';
import { SEASONS, SEASON_META, seasonSourceLabel, type Season } from '@/lib/season';
import { ChevronDown, RotateCcw } from 'lucide-react';
import { useState } from 'react';

interface Props {
  season: Season;
  source: 'manual' | 'weather' | 'calendar';
  override: Season | null;
  onSelect: (s: Season) => void;
  onReset: () => void;
  /** Trailing facts for the pill, e.g. a city and an item count. */
  lead?: string | null;
  trail?: string | null;
  tempC?: number | null;
  /** When supplied, the sheet also owns "only show this season's pieces". */
  filterOn?: boolean;
  onFilterChange?: (on: boolean) => void;
  /** How many pieces the filter is currently hiding. */
  putAway?: number;
  className?: string;
}

/**
 * The season, as one line rather than a control.
 *
 * A four-way segmented switch sat permanently on both home screens and on the
 * wardrobe, asking a question the calendar already answers correctly almost
 * every day of the year. It reads as a fact now: "Delhi · Monsoon wardrobe ·
 * 74 pieces". Tapping it is how you disagree.
 */
export function SeasonPill({
  season, source, override, onSelect, onReset, lead, trail, tempC,
  filterOn, onFilterChange, putAway, className,
}: Props) {
  const [open, setOpen] = useState(false);

  const showingAll = filterOn === false;
  const label = [lead, showingAll ? 'All seasons' : `${SEASON_META[season].label} wardrobe`, trail]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={cn('context-pill', className)}
      >
        <span className="truncate">{label}</span>
        <ChevronDown size={15} className="shrink-0 text-fog-400" aria-hidden />
      </button>

      <OneUISheet open={open} onClose={() => setOpen(false)} title="Season">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 px-1">
            <p className="text-[13px] font-medium text-fog-300">
              {override ? 'Set by you' : seasonSourceLabel(source)}
              {typeof tempC === 'number' ? ` · ${Math.round(tempC)}° outside` : ''}
            </p>
            {override && (
              <button
                type="button"
                onClick={() => { onReset(); setOpen(false); }}
                className="press inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-2 text-[12px] font-semibold text-fog-300 transition-colors hover:text-fog-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
              >
                <RotateCcw size={12} aria-hidden />
                Back to auto
              </button>
            )}
          </div>

          <div role="radiogroup" aria-label="Season" className="seg grid-cols-4">
            {SEASONS.map((s) => {
              const active = season === s;
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => { onSelect(s); setOpen(false); }}
                  className="seg-item text-[13px]"
                >
                  {SEASON_META[s].label}
                </button>
              );
            })}
          </div>

          <p className="px-1 text-[13px] leading-5 text-fog-400">
            {SEASON_META[season].hint} Left alone, the calendar decides.
          </p>

          {onFilterChange && (
            <button
              type="button"
              role="switch"
              aria-checked={filterOn ?? false}
              onClick={() => onFilterChange(!filterOn)}
              className="press mt-1 flex min-h-[56px] items-center justify-between gap-4 rounded-squircle border border-white/[0.07] bg-white/[0.04] px-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
            >
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold text-fog-100">
                  Put the rest away
                </span>
                <span className="block text-[12px] text-fog-400">
                  {filterOn && putAway
                    ? `${putAway} out-of-season ${putAway === 1 ? 'piece' : 'pieces'} hidden`
                    : 'Show only what suits this season'}
                </span>
              </span>
              <span
                className={cn(
                  'relative h-7 w-12 shrink-0 rounded-full transition-colors',
                  filterOn ? 'bg-crimson-400' : 'bg-white/[0.14]'
                )}
              >
                <span
                  className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform duration-200"
                  style={{ transform: filterOn ? 'translateX(22px)' : 'none' }}
                />
              </span>
            </button>
          )}
        </div>
      </OneUISheet>
    </>
  );
}
