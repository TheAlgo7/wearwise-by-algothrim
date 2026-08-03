'use client';

import { AddItemForm } from '@/components/AddItemForm';
import { BatchAddForm } from '@/components/BatchAddForm';
import { cn } from '@/lib/cn';
import { useState } from 'react';

type Mode = 'one' | 'many';

/**
 * One piece at a time, or a batch.
 *
 * Single stays the default because it is the common case (a new pair of shoes).
 * Batch exists for the times a whole season comes out of storage at once.
 */
export function AddModeSwitch() {
  const [mode, setMode] = useState<Mode>('one');

  return (
    <div className="flex flex-col gap-4">
      <div role="radiogroup" aria-label="How many pieces" className="grid grid-cols-2 gap-1 rounded-full bg-white/[0.05] p-1">
        {([
          { id: 'one' as const, label: 'One piece' },
          { id: 'many' as const, label: 'Several' },
        ]).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={mode === id}
            onClick={() => setMode(id)}
            className={cn(
              'press flex min-h-[42px] items-center justify-center rounded-full text-[14px] font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400',
              mode === id ? 'bg-crimson-400 text-white' : 'text-fog-300 hover:text-fog-100'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'one' ? <AddItemForm /> : <BatchAddForm />}
    </div>
  );
}
