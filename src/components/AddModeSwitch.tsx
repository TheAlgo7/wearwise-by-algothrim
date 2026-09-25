'use client';

import { AddItemForm } from '@/components/AddItemForm';
import { BatchAddForm } from '@/components/BatchAddForm';
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
      <div role="radiogroup" aria-label="How many pieces" className="seg grid-cols-2">
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
            className="seg-item"
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'one' ? <AddItemForm /> : <BatchAddForm />}
    </div>
  );
}
