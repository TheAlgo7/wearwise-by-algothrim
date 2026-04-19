'use client';

import { OneUIChip } from '@/components/oneui';
import { MODES } from '@/lib/constants';

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function ModeSelector({ value, onChange }: Props) {
  return (
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
  );
}
