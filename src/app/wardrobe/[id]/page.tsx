'use client';

import { OneUIButton } from '@/components/oneui';
import { useIsOwner } from '@/components/RoleProvider';
import { cn } from '@/lib/cn';
import { colourStory, swatchFor } from '@/lib/colour-story';
import { isFootwear } from '@/lib/item-presentation';
import { SEASON_META, seasonsForItem } from '@/lib/season';
import { createClient } from '@/lib/supabase/client';
import type { Item } from '@/types';
import { Archive, ArrowLeft, ChevronDown, RotateCcw, Shirt, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useEffect, useMemo, useState } from 'react';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * One piece.
 *
 * Revamp, November 2026: the garment hangs in its own colour's light at the
 * top of the page, the way an outfit does on Today, and the facts about it are
 * one quiet list instead of three grey cards. Layer is gone from the list: it
 * is the engine's taxonomy, not something he thinks in.
 */
export default function ItemDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const isOwner = useIsOwner();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [manageOpen, setManageOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  const light = useMemo(() => (item ? colourStory([item]).light : null), [item]);

  const archive = async () => {
    const res = await fetch(`/api/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: !item?.archived }),
    });
    if (res.ok) router.push('/wardrobe');
  };

  const remove = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    const res = await fetch(`/api/items/${id}`, { method: 'DELETE' });
    if (res.ok) router.push('/wardrobe');
  };

  const back = (
    <Link
      href="/wardrobe"
      aria-label="Back to wardrobe"
      className="press flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.12] text-fog-200 transition-colors hover:border-white/[0.2] hover:text-fog-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
    >
      <ArrowLeft size={18} aria-hidden />
    </Link>
  );

  if (loading) {
    return (
      <main className="min-h-dvh px-4 pt-6">
        {back}
        <div className="skeleton mx-auto mt-4 aspect-square w-3/4 animate-pulse rounded-[32px]" />
        <div className="skeleton mt-6 h-8 w-2/3 animate-pulse rounded-full" />
      </main>
    );
  }

  if (!item) {
    return (
      <main className="flex min-h-dvh flex-col gap-4 px-4 pt-6">
        {back}
        <p className="px-1 text-oneui-body text-fog-300">That piece is not in the wardrobe any more.</p>
      </main>
    );
  }

  const colours = [item.primary_color, ...item.secondary_colors].filter(Boolean).join(', ');
  const hasTempRange = item.min_temp_c !== null || item.max_temp_c !== null;
  const temp = hasTempRange ? `${item.min_temp_c ?? '?'}° to ${item.max_temp_c ?? '?'}°` : 'Not set';
  const footwear = isFootwear(item);
  const seasons = seasonsForItem(item);
  const swatch = swatchFor(item.primary_color);

  return (
    <main className="min-h-dvh pb-4">
      <div className="px-4 pt-6">{back}</div>

      {/* The piece, in its own light. */}
      <div className={cn('relative mx-auto w-full max-w-[480px]', footwear ? 'aspect-[4/3]' : 'aspect-square')}>
        {light && <div aria-hidden className="item-light" style={{ '--story': light } as React.CSSProperties} />}
        {item.image_url ? (
          <div className={cn('garment absolute', footwear ? 'inset-[10%]' : 'inset-[7%]')}>
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              sizes="(max-width: 480px) 100vw, 480px"
              className="object-contain"
              priority
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Shirt size={44} strokeWidth={1.2} className="text-fog-500" aria-hidden />
          </div>
        )}
      </div>

      <div className="reach-zone">
        <div className="px-1">
          <h1 className="type-title text-[26px] leading-[1.12] text-balance">{item.name}</h1>
          <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-fog-300">
            {swatch && (
              <span
                className="h-3 w-3 shrink-0 rounded-full ring-1 ring-inset ring-white/[0.2]"
                style={{ background: swatch }}
                aria-hidden
              />
            )}
            {sentence([item.primary_color, item.category?.name].filter(Boolean).join(' · '))}
            {item.archived && <span className="text-fog-400">· Archived</span>}
          </p>
          {item.notes && (
            <p className="mt-3 text-[14px] leading-[1.55] text-fog-300 text-pretty">{item.notes}</p>
          )}
        </div>

        <dl className="mt-2 divide-y divide-white/[0.07] border-y border-white/[0.07] px-1">
          <Row k="Fit" v={item.fit ?? 'Not set'} />
          <Row k="Formality" v={item.formality ? `${item.formality} of 5` : 'Not set'} />
          {/* Seasons, not "Worn 0x": wears are never logged, so that count
              was 0 on every piece and always would be. */}
          <Row
            k="Seasons"
            v={seasons.length === 4 ? 'All year' : seasons.map((s) => SEASON_META[s].label).join(', ') || 'Not set'}
          />
          <Row k="Temperature" v={temp} />
          <Row k="Colours" v={colours || 'Not set'} />
          {item.material.length > 0 && <Row k="Material" v={item.material.join(', ')} />}
        </dl>

        {item.vibe.length > 0 && <Tags label="Vibe" values={item.vibe} />}
        {item.occasions.length > 0 && <Tags label="Occasions" values={item.occasions} />}

        {/* Managing a piece is the owner's alone. Ishita sees the item, not the controls. */}
        {isOwner && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => { setManageOpen((v) => !v); setConfirmDelete(false); }}
              aria-expanded={manageOpen}
              aria-controls="manage-panel"
              className="press flex h-12 w-full items-center justify-between rounded-full border border-white/[0.10] px-5 text-[14px] font-semibold text-fog-200 transition-colors hover:border-white/[0.18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
            >
              <span>Manage piece</span>
              <ChevronDown
                size={16}
                className={cn('text-fog-400 transition-transform', manageOpen && 'rotate-180')}
                aria-hidden
              />
            </button>

            {manageOpen && (
              <div id="manage-panel" className="animate-oneui-fade mt-3">
                <div className="grid grid-cols-2 gap-2">
                  <OneUIButton
                    intent="secondary"
                    leftIcon={item.archived ? <RotateCcw size={16} /> : <Archive size={16} />}
                    onClick={archive}
                  >
                    {item.archived ? 'Unarchive' : 'Archive'}
                  </OneUIButton>
                  <OneUIButton
                    intent={confirmDelete ? 'danger' : 'outline'}
                    leftIcon={<Trash2 size={16} />}
                    onClick={remove}
                  >
                    {confirmDelete ? 'Confirm delete' : 'Delete'}
                  </OneUIButton>
                </div>
                <p className={cn('mt-2 px-1 text-[12px] leading-[1.45]', confirmDelete ? 'text-error-text' : 'text-fog-400')}>
                  {confirmDelete
                    ? 'Tap again to delete it for good. This cannot be undone.'
                    : 'Archive keeps it but stops it appearing in outfits.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

/** First letter only: CSS `capitalize` turned "3 of 5" into "3 Of 5". */
const sentence = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="shrink-0 text-[13px] text-fog-400">{k}</dt>
      <dd className="min-w-0 text-right text-[14px] font-medium text-fog-100">{sentence(v)}</dd>
    </div>
  );
}

function Tags({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="mt-1 px-1">
      <h2 className="mb-2 text-[13px] text-fog-400">{label}</h2>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span key={v} className="rounded-full border border-white/[0.10] px-3 py-1 text-[12px] capitalize text-fog-200">
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}
