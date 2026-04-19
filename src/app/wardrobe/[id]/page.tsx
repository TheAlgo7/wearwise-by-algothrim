'use client';

import { OneUIButton, OneUIHeader, Squircle } from '@/components/oneui';
import { createClient } from '@/lib/supabase/client';
import type { Item } from '@/types';
import { Archive, ArrowLeft, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ItemDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supa = createClient();
    (async () => {
      const { data } = await supa
        .from('items')
        .select('*, category:categories(*)')
        .eq('id', id)
        .single();
      setItem(data as Item);
      setLoading(false);
    })();
  }, [id]);

  const archive = async () => {
    const supa = createClient();
    await supa.from('items').update({ archived: !item?.archived }).eq('id', id);
    router.push('/wardrobe');
  };

  const remove = async () => {
    if (!confirm('Delete this item permanently?')) return;
    const supa = createClient();
    if (item?.image_path) {
      await supa.storage.from('items').remove([item.image_path]);
    }
    await supa.from('items').delete().eq('id', id);
    router.push('/wardrobe');
  };

  if (loading) {
    return (
      <main className="min-h-dvh p-6">
        <div className="h-8 w-40 bg-ink-200 rounded animate-pulse mb-4" />
        <div className="aspect-square rounded-squircle bg-ink-100 animate-pulse" />
      </main>
    );
  }

  if (!item) {
    return (
      <main className="min-h-dvh p-6 flex flex-col gap-4">
        <Link href="/wardrobe" className="text-fog-300 flex items-center gap-1 text-oneui-cap">
          <ArrowLeft size={16} /> Back to wardrobe
        </Link>
        <p className="text-fog-300">Item not found.</p>
      </main>
    );
  }

  return (
    <main className="min-h-dvh pb-4">
      <OneUIHeader
        eyebrow={item.category?.name ?? 'ITEM'}
        title={item.name}
        subtitle={item.notes ?? undefined}
        right={
          <Link href="/wardrobe" aria-label="Back">
            <OneUIButton size="icon" intent="secondary"><ArrowLeft size={18} /></OneUIButton>
          </Link>
        }
      />
      <div className="reach-zone">
        <Squircle variant="raised" className="aspect-square overflow-hidden flex items-center justify-center">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.name}
              width={600}
              height={600}
              className="object-contain w-full h-full"
              unoptimized
            />
          ) : (
            <span className="text-fog-400">No image</span>
          )}
        </Squircle>

        <Squircle variant="flat" className="p-4 grid grid-cols-2 gap-y-3 gap-x-4 text-oneui-cap">
          <KV k="Layer" v={item.category?.layer_type ?? '—'} />
          <KV k="Fit" v={item.fit ?? '—'} />
          <KV k="Sleeve" v={item.sleeve_length ?? '—'} />
          <KV k="Formality" v={item.formality ? `${item.formality}/5` : '—'} />
          <KV k="Temp range" v={`${item.min_temp_c ?? '–'}°C → ${item.max_temp_c ?? '–'}°C`} />
          <KV k="Worn" v={`${item.times_worn}×`} />
          <KV k="Colors" v={[item.primary_color, ...item.secondary_colors].filter(Boolean).join(', ') || '—'} />
          <KV k="Material" v={item.material.join(', ') || '—'} />
        </Squircle>

        {item.vibe.length > 0 && (
          <Squircle variant="flat" className="p-4">
            <div className="oneui-hero-sub text-fog-400 mb-2">Vibe</div>
            <div className="flex flex-wrap gap-1.5">
              {item.vibe.map((v) => (
                <span key={v} className="text-oneui-cap px-2.5 py-1 rounded-full bg-ink-300 text-fog-200">{v}</span>
              ))}
            </div>
          </Squircle>
        )}

        {item.occasions.length > 0 && (
          <Squircle variant="flat" className="p-4">
            <div className="oneui-hero-sub text-fog-400 mb-2">Occasions</div>
            <div className="flex flex-wrap gap-1.5">
              {item.occasions.map((o) => (
                <span key={o} className="text-oneui-cap px-2.5 py-1 rounded-full bg-ink-300 text-fog-200">{o}</span>
              ))}
            </div>
          </Squircle>
        )}

        <div className="grid grid-cols-2 gap-2 mt-2">
          <OneUIButton intent="secondary" leftIcon={<Archive size={16} />} onClick={archive}>
            {item.archived ? 'Unarchive' : 'Archive'}
          </OneUIButton>
          <OneUIButton intent="danger" leftIcon={<Trash2 size={16} />} onClick={remove}>
            Delete
          </OneUIButton>
        </div>
      </div>
    </main>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="oneui-hero-sub text-fog-400">{k}</div>
      <div className="text-oneui-body text-fog-100 capitalize">{v}</div>
    </div>
  );
}
