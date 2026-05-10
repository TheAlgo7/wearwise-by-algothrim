'use client';

import { OneUIChip } from '@/components/oneui';
import { MODES } from '@/lib/constants';

interface Props {
  value: string;
  onChange: (v: string) => void;
  customContext: string;
  onCustomContextChange: (v: string) => void;
}

export function ModeSelector({ value, onChange, customContext, onCustomContextChange }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="chip-row" role="group" aria-label="Mode">
        {MODES.map((m) => (
          <OneUIChip
            key={m.id}
            active={m.id === value}
            onClick={() => onChange(m.id)}
            variant="mode"
          >
            {m.label}
          </OneUIChip>
        ))}
      </div>

      {value === 'describe' && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="describe-context" className="sr-only">Describe your occasion</label>
          <input
            id="describe-context"
            type="text"
            value={customContext}
            onChange={(e) => onCustomContextChange(e.target.value)}
            placeholder="e.g. family dinner at a nice restaurant..."
            className="w-full rounded-[1rem] px-4 py-3 text-[14px] text-crimson-50 placeholder:text-fog-300 outline-none focus:ring-2 focus:ring-crimson-400/50 bg-white/[0.06] border border-white/[0.10]"
            autoFocus
          />
        </div>
      )}
    </div>
  );
}
