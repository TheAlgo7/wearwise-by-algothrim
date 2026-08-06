'use client';

import { OneUIButton, OneUIChip, OneUISheet } from '@/components/oneui';
import { SEASONS, SEASON_META, type Season } from '@/lib/season';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  items: string[];
  /** Prefilled season, usually whatever the app is currently dressing for. */
  defaultSeason: Season;
  reasoning?: string;
  confidence?: number;
  context?: Record<string, unknown>;
  /** Ishita's flow adds a message; his does not. */
  withNote?: boolean;
  title?: string;
  cta?: string;
}

/** Names that fit the way he actually thinks about outfits. */
const NAME_SUGGESTIONS = ['Sunday Church', 'Date Night', 'Chill Home', 'Street Casual', 'Travel Day', 'Family Dinner'];

export function SaveLookSheet({
  open,
  onClose,
  onSaved,
  items,
  defaultSeason,
  reasoning,
  confidence,
  context,
  withNote,
  title = 'Save this look',
  cta = 'Save look',
}: Props) {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [season, setSeason] = useState<Season | null>(defaultSeason);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      // Fresh sheet each time it opens.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName('');
      setNote('');
      setSeason(defaultSeason);
      setError(null);
      setBusy(false);
    }
  }, [open, defaultSeason]);

  const save = async () => {
    if (!name.trim()) {
      setError('Give it a name so you can find it later.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/looks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          name: name.trim(),
          note: withNote && note.trim() ? note.trim() : undefined,
          reasoning,
          confidence,
          season,
          context,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save that.');
      setBusy(false);
    }
  };

  return (
    <OneUISheet open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-5 pb-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="look-name" className="px-1 text-[13px] font-semibold text-fog-300">
            Name
          </label>
          <input
            id="look-name"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(null); }}
            placeholder="Sunday Church"
            autoComplete="off"
            className="h-12 rounded-squircle-sm border border-white/[0.06] bg-ink-200 px-4 text-[16px] text-fog-100 outline-none focus:border-crimson-300"
          />
          <div className="chip-row !mx-0 !px-0">
            {NAME_SUGGESTIONS.map((s) => (
              <OneUIChip key={s} active={name === s} onClick={() => { setName(s); setError(null); }}>
                {s}
              </OneUIChip>
            ))}
          </div>
        </div>

        {withNote && (
          <div className="flex flex-col gap-2">
            <label htmlFor="look-note" className="px-1 text-[13px] font-semibold text-fog-300">
              Say something
            </label>
            <textarea
              id="look-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={280}
              placeholder="Wear this on Saturday, please."
              className="resize-none rounded-squircle-sm border border-white/[0.06] bg-ink-200 px-4 py-3 text-[16px] leading-6 text-fog-100 outline-none focus:border-crimson-300"
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <p className="px-1 text-[13px] font-semibold text-fog-300">Season</p>
          <div className="flex flex-wrap gap-2">
            <OneUIChip active={season === null} onClick={() => setSeason(null)}>
              Any
            </OneUIChip>
            {SEASONS.map((s) => (
              <OneUIChip key={s} active={season === s} onClick={() => setSeason(s)}>
                {SEASON_META[s].label}
              </OneUIChip>
            ))}
          </div>
        </div>

        {error && (
          <p role="alert" className="px-1 text-[13px] text-error-text">{error}</p>
        )}

        <OneUIButton size="lg" fullWidth onClick={save} disabled={busy}>
          {busy ? <><Loader2 size={17} className="animate-spin" aria-hidden /> Saving</> : cta}
        </OneUIButton>
      </div>
    </OneUISheet>
  );
}
