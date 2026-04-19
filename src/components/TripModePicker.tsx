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

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="press flex items-center gap-2 rounded-full bg-ink-100 border border-white/[0.06] px-4 h-10 text-oneui-cap text-fog-200 hover:text-fog-100"
      >
        {tripCity ? (
          <>
            <Plane size={14} className="text-crimson-300" />
            <span className="text-fog-100 font-semibold">{tripCity}</span>
            <span
              role="button"
              aria-label="Clear trip"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
                setInput('');
              }}
              className="ml-1 text-fog-400 hover:text-crimson-300"
            >
              <X size={14} />
            </span>
          </>
        ) : (
          <>
            <MapPin size={14} />
            <span>Set trip destination</span>
          </>
        )}
      </button>

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
