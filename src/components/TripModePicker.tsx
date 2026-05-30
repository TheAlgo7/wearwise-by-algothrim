'use client';

import { OneUIButton, OneUISheet } from '@/components/oneui';
import { MapPin, Plane, X } from 'lucide-react';
import { useState } from 'react';

interface Props {
  tripCity: string | null;
  onChange: (v: string | null) => void;
}

export function TripModePicker({ tripCity, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(tripCity ?? '');

  // Sync the field to the current trip city at open time (no effect needed).
  const openSheet = () => {
    setInput(tripCity ?? '');
    setOpen(true);
  };

  return (
    <>
      {tripCity ? (
        <div className="inline-flex max-w-full items-center rounded-full bg-ink-100 border border-white/[0.06] h-10 text-oneui-cap text-fog-200 overflow-hidden self-start">
          <button
            type="button"
            onClick={openSheet}
            className="press flex min-w-0 items-center gap-2 h-full pl-4 pr-2 hover:text-fog-100"
          >
            <Plane size={14} className="text-crimson-300 shrink-0" />
            <span className="text-fog-100 font-semibold truncate">{tripCity}</span>
          </button>
          <button
            type="button"
            aria-label="Clear trip"
            onClick={() => {
              onChange(null);
              setInput('');
            }}
            className="press h-full w-10 flex items-center justify-center text-fog-400 hover:text-crimson-300"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={openSheet}
          className="press flex items-center gap-2 rounded-full bg-ink-100 border border-white/[0.06] px-4 h-10 text-oneui-cap text-fog-200 hover:text-fog-100 self-start"
        >
          <MapPin size={14} />
          <span>Set trip destination</span>
        </button>
      )}

      <OneUISheet open={open} onClose={() => setOpen(false)} title="Trip destination">
        <p className="text-oneui-body text-fog-300 mb-4">
          Heading somewhere else? Enter the city and WearWise will pull that forecast instead of
          your current location.
        </p>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='e.g. "Reykjavik,IS" or "Dubai,AE"'
          className="w-full h-12 px-4 rounded-squircle bg-ink-200 border border-white/[0.06] text-fog-100 placeholder:text-fog-500 outline-none focus:border-crimson-300"
        />
        <div className="mt-4 flex gap-2">
          <OneUIButton
            intent="secondary"
            fullWidth
            type="button"
            onClick={() => {
              setInput('');
              onChange(null);
              setOpen(false);
            }}
          >
            Clear
          </OneUIButton>
          <OneUIButton
            intent="primary"
            fullWidth
            type="button"
            onClick={() => {
              onChange(input.trim() || null);
              setOpen(false);
            }}
          >
            Apply
          </OneUIButton>
        </div>
      </OneUISheet>
    </>
  );
}
