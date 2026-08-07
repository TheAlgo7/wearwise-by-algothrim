'use client';

import { createClient } from '@/lib/supabase/client';
import type { Item } from '@/types';
import { useEffect, useLayoutEffect, useState } from 'react';

/** useLayoutEffect warns during SSR; there is nothing to lay out there anyway. */
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * The wardrobe, fetched once.
 *
 * Every screen used to run its own `items?select=*,category(*)` on mount, and
 * `template.tsx` remounts the whole tree on every route change — so opening
 * Wardrobe, tapping a piece and pressing back was three full fetches and three
 * full re-renders of 119 cards. That is most of what "hella slow" was, and it
 * is also why scroll position was never restored: the list was empty on the
 * frame the restore ran, so there was nothing to scroll back to.
 *
 * Module-level state survives route changes within the same JS context, so the
 * second visit paints from memory. sessionStorage covers a PWA relaunch.
 * Revalidation happens in the background and only re-renders if something
 * actually changed.
 */

const KEY = 'wearwise.wardrobe.v2';
const TTL_MS = 5 * 60 * 1000;

let memory: { items: Item[]; at: number } | null = null;
/** Shared in-flight request, so two components mounting together fetch once. */
let inflight: Promise<Item[]> | null = null;

function readSession(): { items: Item[]; at: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { items: Item[]; at: number };
    return Array.isArray(parsed?.items) ? parsed : null;
  } catch {
    return null;
  }
}

function writeSession(payload: { items: Item[]; at: number }) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* over quota; the memory cache still does the important work */
  }
}

async function fetchItems(): Promise<Item[]> {
  if (inflight) return inflight;
  inflight = (async () => {
    const supa = createClient();
    const { data, error } = await supa
      .from('items')
      .select('*, category:categories(*)')
      .eq('archived', false);
    if (error) throw new Error(error.message);
    const items = (data ?? []) as Item[];
    memory = { items, at: Date.now() };
    writeSession(memory);
    return items;
  })();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

/** Drop the cache after a write so the next read sees the change. */
export function invalidateWardrobe() {
  memory = null;
  if (typeof window !== 'undefined') {
    try { window.sessionStorage.removeItem(KEY); } catch { /* ignore */ }
  }
}

export function useWardrobe() {
  // Deliberately NOT seeded from the cache in the initial state. The server
  // renders with no cache, so seeding here made the first client render differ
  // from the server's and React threw a hydration mismatch and regenerated the
  // tree — which, among other things, threw away the restored scroll position.
  // useLayoutEffect fills it in before paint instead, so there is still no flash.
  const [items, setItems] = useState<Item[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const cached = memory ?? readSession();
    if (!cached) return;
    memory = cached;
    setItems(cached.items);
    setReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const current = memory ?? readSession();
    if (current) memory = current;

    // Fresh enough: paint from cache and do not touch the network at all.
    if (current && Date.now() - current.at < TTL_MS) return;

    (async () => {
      try {
        const next = await fetchItems();
        if (cancelled) return;
        setItems(next);
        setError(false);
      } catch {
        if (!cancelled && !current) setError(true);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return { items, ready, error };
}
