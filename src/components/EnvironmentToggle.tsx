'use client';

import { OneUIToggle } from '@/components/oneui';
import { Snowflake, Sun } from 'lucide-react';
import type { Environment } from '@/types';

interface Props {
  value: Environment;
  onChange: (v: Environment) => void;
}

export function EnvironmentToggle({ value, onChange }: Props) {
  return (
    <OneUIToggle
      value={value}
      onChange={(v) => onChange(v as Environment)}
      options={[
        { value: 'outdoor',   label: 'Outdoor',     icon: <Sun size={16} /> },
        { value: 'indoor-ac', label: 'Indoor (AC)', icon: <Snowflake size={16} /> },
      ]}
    />
  );
}
