'use client';

import type { CareLog, CarePlan, CareProduct, CareProfile } from '@/lib/care/types';
import { useCallback, useEffect, useState } from 'react';

export interface CareState {
  plan: CarePlan;
  /** Both routines, so the screen can show tonight alongside this morning. */
  morning: CarePlan;
  evening: CarePlan;
  profile: CareProfile;
  products: CareProduct[];
  logs: CareLog[];
}

export interface CareQuery {
  mode: string;
  environment: string;
  plannedFor: string;
  tempC?: number | null;
  humidity?: number | null;
  condition?: string | null;
}

function toQuery(q: CareQuery): string {
  const p = new URLSearchParams({
    mode: q.mode,
    environment: q.environment,
    planned_for: q.plannedFor,
  });
  if (typeof q.tempC === 'number') p.set('temp_c', String(q.tempC));
  if (typeof q.humidity === 'number') p.set('humidity', String(q.humidity));
  if (q.condition) p.set('condition', q.condition);
  return p.toString();
}

/**
 * Care state, fetched from the server.
 *
 * Deliberately not a Supabase client read: the care tables deny the browser
 * key outright, so this is the only way in and the owner check happens on the
 * server. Cheap enough to refetch — it is a rules evaluation, not a model call.
 */
export function useCare(query: CareQuery, enabled = true) {
  const [state, setState] = useState<CareState | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const qs = toQuery(query);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const res = await fetch(`/api/care?${qs}`, { signal });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error ?? `HTTP ${res.status}`);
          setState(null);
        } else {
          setState((await res.json()) as CareState);
          setError(null);
        }
      } catch (err) {
        if (signal?.aborted) return;
        setError(err instanceof Error ? err.message : 'Network error');
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [qs]
  );

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(controller.signal);
    return () => controller.abort();
  }, [load, enabled]);

  /**
   * Log something and pull a fresh plan, since one action can change the next
   * (a shave today makes tonight a recovery night). Returns the new log's id so
   * the caller can offer Undo.
   */
  const log = useCallback(
    async (body: {
      action: string; domain: string; area?: string | null; product_id?: string | null;
      note?: string | null; severity?: number | null; done_at?: string | null;
    }): Promise<string | null> => {
      const res = await fetch('/api/care', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.details ?? data.error ?? `HTTP ${res.status}`);
      await load();
      return (data.log?.id as string | undefined) ?? null;
    },
    [load]
  );

  /** Remove one log by id, or failing that the latest of an action today. */
  const undo = useCallback(
    async (target: { id: string } | { action: string }) => {
      const q = 'id' in target ? `id=${target.id}` : `action=${encodeURIComponent(target.action)}`;
      const res = await fetch(`/api/care?${q}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
      await load();
    },
    [load]
  );

  const patchProfile = useCallback(
    async (patch: Record<string, unknown>) => {
      const res = await fetch('/api/care', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
      await load();
    },
    [load]
  );

  return { state, loading, error, reload: load, log, undo, patchProfile };
}
