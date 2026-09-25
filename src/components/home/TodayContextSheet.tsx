'use client';

import { OneUIChip, OneUISheet } from '@/components/oneui';
import { MODES } from '@/lib/constants';
import { SEASONS, SEASON_META, seasonSourceLabel, type Season } from '@/lib/season';
import { PLANNED_FOR_LABELS, type PlannedFor, type TodayContext } from '@/lib/today-context';
import { ChevronDown, MapPin, Plane, RotateCcw, Snowflake, Sun } from 'lucide-react';
import { useState } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  context: TodayContext;
  customContext: string;
  season: Season;
  seasonSource: 'manual' | 'weather' | 'calendar';
  seasonOverride: Season | null;
  onApply: (next: {
    context: TodayContext;
    customContext: string;
    seasonOverride: Season | null;
  }) => void;
}

/**
 * Every setting the outfit engine takes, in one place, opened from one pill.
 *
 * The point is not that these controls got smaller. It is that they are gone
 * from the screen he opens at 7am. He only comes here when he wants to argue
 * with the recommendation, and then everything is here at once.
 */
export function TodayContextSheet(props: Props) {
  return (
    <OneUISheet open={props.open} onClose={props.onClose} title="Style this moment">
      <ContextForm {...props} />
    </OneUISheet>
  );
}

function ContextForm({
  onClose,
  context,
  customContext,
  season,
  seasonSource,
  seasonOverride,
  onApply,
}: Props) {
  const [draft, setDraft] = useState<TodayContext>(context);
  const [note, setNote] = useState(customContext);
  const [override, setOverride] = useState<Season | null>(seasonOverride);
  const [tripInput, setTripInput] = useState(context.tripCity ?? '');
  const [away, setAway] = useState(context.tripCity !== null);
  const [advanced, setAdvanced] = useState(false);

  const resolvedSeason = override ?? season;

  const apply = () => {
    const trip = away ? tripInput.trim() || null : null;
    onApply({
      context: { ...draft, tripCity: trip },
      customContext: note,
      seasonOverride: override,
    });
    onClose();
  };

  return (
    <div className="flex flex-col gap-6 pb-2">
      <Group label="Occasion">
        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => (
            <OneUIChip
              key={m.id}
              active={draft.mode === m.id}
              onClick={() => setDraft((d) => ({ ...d, mode: m.id }))}
            >
              {m.label}
            </OneUIChip>
          ))}
        </div>
        {draft.mode === 'describe' && (
          <>
            <label htmlFor="context-describe" className="sr-only">
              Describe the occasion
            </label>
            <input
              id="context-describe"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Family dinner somewhere nice"
              autoFocus
              className="mt-3 h-12 w-full rounded-squircle-sm border border-white/[0.08] bg-ink-200 px-4 text-[15px] text-fog-100 outline-none placeholder:text-fog-400 focus:border-crimson-400"
            />
          </>
        )}
        <p className="mt-2 text-[12px] leading-5 text-fog-400">
          {MODES.find((m) => m.id === draft.mode)?.hint}
        </p>
      </Group>

      <Group label="When">
        <Segmented
          value={draft.plannedFor}
          onChange={(v) => setDraft((d) => ({ ...d, plannedFor: v as PlannedFor }))}
          options={(Object.keys(PLANNED_FOR_LABELS) as PlannedFor[]).map((k) => ({
            value: k,
            label: PLANNED_FOR_LABELS[k],
          }))}
          ariaLabel="When"
        />
      </Group>

      <Group label="Where">
        <Segmented
          value={away ? 'away' : 'here'}
          onChange={(v) => setAway(v === 'away')}
          options={[
            { value: 'here', label: 'Where I am', icon: <MapPin size={15} /> },
            { value: 'away', label: 'Somewhere else', icon: <Plane size={15} /> },
          ]}
          ariaLabel="Where"
        />
        {away && (
          <>
            <label htmlFor="context-trip" className="sr-only">
              Trip destination
            </label>
            <input
              id="context-trip"
              value={tripInput}
              onChange={(e) => setTripInput(e.target.value)}
              placeholder="Goa, IN"
              className="mt-3 h-12 w-full rounded-squircle-sm border border-white/[0.08] bg-ink-200 px-4 text-[15px] text-fog-100 outline-none placeholder:text-fog-400 focus:border-crimson-400"
            />
            <p className="mt-2 text-[12px] leading-5 text-fog-400">
              WearWise pulls that forecast instead of your current location.
            </p>
          </>
        )}
      </Group>

      <Group label="Environment">
        <Segmented
          value={draft.environment}
          onChange={(v) => setDraft((d) => ({ ...d, environment: v as TodayContext['environment'] }))}
          options={[
            { value: 'outdoor', label: 'Outdoor', icon: <Sun size={15} /> },
            { value: 'indoor-ac', label: 'Air-conditioned', icon: <Snowflake size={15} /> },
          ]}
          ariaLabel="Environment"
        />
      </Group>

      <div>
        <button
          type="button"
          onClick={() => setAdvanced((v) => !v)}
          aria-expanded={advanced}
          className="press flex min-h-[44px] w-full items-center justify-between gap-3 rounded-squircle-sm px-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
        >
          <span className="text-[15px] font-semibold text-fog-100">Advanced</span>
          <span className="flex items-center gap-2 text-[12px] font-medium text-fog-400">
            {SEASON_META[resolvedSeason].label}
            <ChevronDown
              size={16}
              aria-hidden
              className="transition-transform duration-200"
              style={{ transform: advanced ? 'rotate(180deg)' : undefined }}
            />
          </span>
        </button>

        {advanced && (
          <div className="animate-oneui-fade mt-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3 px-1">
              <p className="text-[13px] font-medium text-fog-300">Season</p>
              {override ? (
                <button
                  type="button"
                  onClick={() => setOverride(null)}
                  className="press inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-2 text-[12px] font-semibold text-fog-300 transition-colors hover:text-fog-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
                >
                  <RotateCcw size={12} aria-hidden />
                  Back to auto
                </button>
              ) : (
                <p className="text-[12px] font-medium text-fog-400">{seasonSourceLabel(seasonSource)}</p>
              )}
            </div>
            <div role="radiogroup" aria-label="Season" className="seg grid-cols-4">
              {SEASONS.map((s) => {
                const active = resolvedSeason === s;
                return (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setOverride(override === s ? null : s)}
                    className="seg-item text-[13px]"
                  >
                    {SEASON_META[s].label}
                  </button>
                );
              })}
            </div>
            <p className="px-1 text-[12px] leading-5 text-fog-400">
              {SEASON_META[resolvedSeason].hint} Left alone, the calendar decides.
            </p>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={apply}
        className="press sticky bottom-0 h-14 w-full rounded-full bg-crimson-400 text-[16px] font-semibold text-white transition-colors hover:bg-crimson-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-100"
      >
        Update recommendation
      </button>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2.5 px-1 text-[15px] font-semibold leading-5 text-fog-100">{label}</h3>
      {children}
    </section>
  );
}

function Segmented({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; icon?: React.ReactNode }[];
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="seg"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className="seg-item text-[13px]"
          >
            {o.icon}
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
