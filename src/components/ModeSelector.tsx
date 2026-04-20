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
      <div className="chip-row">
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
        <input
          type="text"
          value={customContext}
          onChange={(e) => onCustomContextChange(e.target.value)}
          placeholder="e.g. family dinner at a nice restaurant..."
          className="w-full rounded-[1rem] px-4 py-3 text-[14px] text-[#FFEDE8] placeholder:text-[#A89098] outline-none"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)',
          }}
          autoFocus
        />
      )}
    </div>
  );
}
