'use client';

import { OneUIButton, OneUIHeader } from '@/components/oneui';
import { WardrobeGrid } from '@/components/WardrobeGrid';
import { createClient } from '@/lib/supabase/client';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import type { Item } from '@/types';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function WardrobePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  useScrollRestoration('wardrobe', !loading);

  useEffect(() => {
    const supa = createClient();
    (async () => {
      const { data } = await supa
        .from('items')
        .select('*, category:categories(*)')
        .order('created_at', { ascending: false });
      setItems((data ?? []) as Item[]);
      setLoading(false);
    })();
  }, []);

  return (
    <main className="min-h-dvh pb-4">
      <OneUIHeader
        eyebrow="WARDROBE"
        title="Your pieces"
        subtitle={loading ? '—' : `${items.filter((i) => !i.archived).length} items`}
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
                className="aspect-[3/4] rounded-[2rem] animate-pulse"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              />
            ))}
          </div>
        ) : (
          <WardrobeGrid items={items.filter((i) => !i.archived)} />
        )}
      </div>
    </main>
  );
}
