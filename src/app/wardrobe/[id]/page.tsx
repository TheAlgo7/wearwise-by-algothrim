'use client';

import { OneUIButton, OneUIHeader, Squircle } from '@/components/oneui';
import { cn } from '@/lib/cn';
import { isFootwear } from '@/lib/item-presentation';
import { createClient } from '@/lib/supabase/client';
import type { Item } from '@/types';
import { Archive, ArrowLeft, ChevronDown, RotateCcw, Trash2 } from 'lucide-react';
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
  const [manageOpen, setManageOpen] = useState(false);

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
    if (!confirm('Delete this item permanently? This cannot be undone.')) return;
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
        <div className="aspect-square rounded-squircle bg-black animate-pulse" />
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

  const colors = [item.primary_color, ...item.secondary_colors].filter(Boolean).join(', ');
  const hasTempRange = item.min_temp_c !== null || item.max_temp_c !== null;
  const temp = hasTempRange ? `${item.min_temp_c ?? '-'}°C to ${item.max_temp_c ?? '-'}°C` : 'Not set';
  const footwear = isFootwear(item);

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
        <div className={cn('relative overflow-hidden rounded-[28px] bg-[#1A1819] border border-white/[0.07]', footwear ? 'aspect-[4/3]' : 'aspect-square')}>
          {item.image_url ? (
            <div className={cn('absolute', footwear ? 'inset-[12%]' : 'inset-[8%]')}>
              <Image
                src={item.image_url}
                alt={item.name}
                fill
                sizes="(max-width: 480px) 100vw, 560px"
                className="object-contain"
                priority
                unoptimized
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-fog-400">No image</div>
          )}
        </div>

        <Squircle variant="flat" className="p-4">
          <div className="grid grid-cols-2 gap-3">
            <KV k="Layer" v={item.category?.layer_type ?? '-'} />
            <KV k="Fit" v={item.fit ?? '-'} />
            <KV k="Formality" v={item.formality ? `${item.formality}/5` : '-'} />
            <KV k="Worn" v={`${item.times_worn}x`} />
          </div>
        </Squircle>

        <Squircle variant="flat" className="p-4">
          <div className="grid grid-cols-1 gap-3">
            <KV k="Temperature" v={temp} />
            <KV k="Colors" v={colors || '-'} />
            <KV k="Material" v={item.material.join(', ') || '-'} />
          </div>
        </Squircle>

        {(item.vibe.length > 0 || item.occasions.length > 0) && (
          <Squircle variant="flat" className="p-4">
            {item.vibe.length > 0 && (
              <>
                <div className="oneui-hero-sub text-fog-400 mb-2">Vibe</div>
                <TagList values={item.vibe} />
              </>
            )}
            {item.occasions.length > 0 && (
              <div className={item.vibe.length > 0 ? 'mt-4' : ''}>
                <div className="oneui-hero-sub text-fog-400 mb-2">Occasions</div>
                <TagList values={item.occasions} />
              </div>
            )}
          </Squircle>
        )}

        <div className="pt-1">
          <button
            onClick={() => setManageOpen((v) => !v)}
            className="press w-full h-11 rounded-full bg-white/[0.06] border border-white/[0.06] px-4 flex items-center justify-between text-oneui-cap font-semibold text-[#D9C8CC] outline-none focus-visible:ring-2 focus-visible:ring-[#E2335D]"
          >
            <span>Manage item</span>
            <ChevronDown
              size={15}
              className={manageOpen ? 'rotate-180 transition-transform' : 'transition-transform'}
              style={{ color: '#FF86A0' }}
            />
          </button>

          {manageOpen && (
            <Squircle variant="flat" className="mt-3 p-3 animate-oneui-fade">
              <div className="grid grid-cols-2 gap-2">
                <OneUIButton
                  intent="secondary"
                  leftIcon={item.archived ? <RotateCcw size={16} /> : <Archive size={16} />}
                  onClick={archive}
                >
                  {item.archived ? 'Unarchive' : 'Archive'}
                </OneUIButton>
                <OneUIButton intent="outline" leftIcon={<Trash2 size={16} />} onClick={remove}>
                  Delete
                </OneUIButton>
              </div>
              <p className="mt-2 px-1 text-[11px] leading-[1.4] text-[#FFD9DA]/45">
                Delete asks for confirmation. Archive hides this piece from outfit generation.
              </p>
            </Squircle>
          )}
        </div>
      </div>
    </main>
  );
}

function TagList({ values }: { values: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((v) => (
        <span key={v} className="text-oneui-cap px-2.5 py-1 rounded-full bg-ink-300 text-fog-200">{v}</span>
      ))}
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <div className="oneui-hero-sub text-fog-400">{k}</div>
      <div className="text-oneui-body text-fog-100 truncate">{v}</div>
    </div>
  );
}
