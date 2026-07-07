'use client';

import { OneUIHeader, Squircle } from '@/components/oneui';
import { createClient } from '@/lib/supabase/client';
import type { Item, Outfit } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

export default function OutfitsPage() {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [items, setItems] = useState<Map<string, Item>>(new Map());
  const [loading, setLoading] = useState(true);
  // Honest error state — a failed read renders as an error with Retry,
  // never as a silent "Nothing yet" empty state.
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    const supa = createClient();
    const [{ data: o, error: oErr }, { data: i, error: iErr }] = await Promise.all([
      supa.from('outfits').select('*').order('created_at', { ascending: false }).limit(50),
      supa.from('items').select('*, category:categories(*)'),
    ]);
    const failed = Boolean(oErr || iErr);
    setLoadError(failed);
    if (!failed) {
      setOutfits((o ?? []) as Outfit[]);
      setItems(new Map(((i ?? []) as Item[]).map((x) => [x.id, x])));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <main className="min-h-dvh pb-4">
      <OneUIHeader
        eyebrow="HISTORY"
        title="Your outfits"
        subtitle={loading || (loadError && outfits.length === 0) ? '—' : `${outfits.length} recent`}
      />
      <div className="reach-zone">
        {loading ? (
          <div className="grid gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 rounded-squircle bg-ink-100 animate-pulse" />
            ))}
          </div>
        ) : loadError && outfits.length === 0 ? (
          <div role="alert" className="rounded-[1.65rem] bg-ink-100 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold leading-5 text-fog-100">Couldn&apos;t load your outfits</p>
                <p className="mt-1 text-[13px] leading-5 text-fog-400">Check your connection and try again.</p>
              </div>
              <button
                type="button"
                onClick={() => { setLoading(true); void load(); }}
                className="min-h-[44px] shrink-0 rounded-full bg-crimson-400/[0.14] px-5 text-[13px] font-semibold text-crimson-200 transition-colors hover:bg-crimson-400/[0.22]"
              >
                Retry
              </button>
            </div>
          </div>
        ) : outfits.length === 0 ? (
          <div className="text-center text-fog-400 text-oneui-body py-10">
            Nothing yet. Generate a fit on the <Link className="text-crimson-300 underline" href="/">Today</Link> tab, then tap "I'm wearing this".
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {outfits.map((o) => (
              <Squircle key={o.id} variant="flat" className="p-3">
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {o.items.map((id) => {
                    const it = items.get(id);
                    return (
                      <div key={id} className="shrink-0 w-16 h-16 rounded-squircle-sm bg-ink-300 overflow-hidden flex items-center justify-center">
                        {it?.image_url ? (
                          <Image src={it.image_url} alt={it.name} width={64} height={64} sizes="64px" className="object-contain w-full h-full" />
                        ) : (
                          <span className="text-[11px] text-fog-500 text-center px-1">{it?.name ?? '?'}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 flex items-center justify-between text-oneui-cap text-fog-300">
                  <span>{new Date(o.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  <span>
                    {o.context?.mode && <span className="mr-2">{o.context.mode}</span>}
                    {o.context?.temp_c !== undefined && <span>{Math.round(o.context.temp_c)}°</span>}
                  </span>
                </div>
                {o.ai_reasoning && <p className="mt-1 text-oneui-cap text-fog-400 text-pretty">{o.ai_reasoning}</p>}
              </Squircle>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
