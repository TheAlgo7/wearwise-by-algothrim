'use client';

import { OneUIButton, OneUIHeader } from '@/components/oneui';
import { WardrobeGrid } from '@/components/WardrobeGrid';
import { createClient } from '@/lib/supabase/client';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import type { Item } from '@/types';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

export default function WardrobePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  // Honest error state — a failed read renders as an error with Retry,
  // never as a silently empty wardrobe. A failed refresh keeps existing items.
  const [loadError, setLoadError] = useState(false);
  useScrollRestoration('wardrobe', !loading);

  const load = useCallback(async (signal: AbortSignal) => {
    const supa = createClient();
    const { data, error } = await supa
      .from('items')
      .select('*, category:categories(*)')
      .order('created_at', { ascending: false })
      .abortSignal(signal);
    if (signal.aborted) return;
    setLoadError(Boolean(error));
    if (!error) setItems((data ?? []) as Item[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return (
    <main className="min-h-dvh pb-4">
      <OneUIHeader
        eyebrow="WARDROBE"
        title="Your pieces"
        subtitle={loading ? '—' : loadError && items.length === 0 ? '—' : `${items.filter((i) => !i.archived).length} items`}
        right={
          <Link href="/wardrobe/add" aria-label="Add item">
            <OneUIButton size="icon" intent="primary">
              <Plus size={20} />
            </OneUIButton>
          </Link>
        }
      />
      <div className="reach-zone">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] rounded-[2rem] animate-pulse bg-white/[0.05]"
              />
            ))}
          </div>
        ) : loadError && items.length === 0 ? (
          <div role="alert" className="rounded-[1.65rem] bg-ink-100 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold leading-5 text-fog-100">Couldn&apos;t load your wardrobe</p>
                <p className="mt-1 text-[13px] leading-5 text-fog-400">Check your connection and try again.</p>
              </div>
              <button
                type="button"
                onClick={() => { setLoading(true); void load(new AbortController().signal); }}
                className="min-h-[44px] shrink-0 rounded-full bg-crimson-400/[0.14] px-5 text-[13px] font-semibold text-crimson-200 transition-colors hover:bg-crimson-400/[0.22]"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <WardrobeGrid items={items.filter((i) => !i.archived)} />
        )}
      </div>
    </main>
  );
}
