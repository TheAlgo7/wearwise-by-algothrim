'use client';

import { RoutineStep } from '@/components/care/RoutineStep';
import { OneUIHeader, OneUISheet } from '@/components/oneui';
import { useCare } from '@/hooks/useCare';
import { cn } from '@/lib/cn';
import { modeForDate } from '@/lib/modes';
import { readTodayContext } from '@/lib/today-context';
import { readCachedWeather } from '@/lib/weather-cache';
import type { CareProduct, DueItem } from '@/lib/care/types';
import { AlertTriangle, Check, Droplets, Scissors, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type Tab = 'routine' | 'products';

/**
 * Care.
 *
 * Two segments, not five. GPT's sketch had Skin, Hair and Body as separate
 * tabs, but that is a filing cabinet, not a routine: nobody does "all their
 * skin steps" and then "all their hair steps" — they shampoo in the shower and
 * moisturise after it. The routine interleaves them in the order they actually
 * happen, and the domain only becomes a grouping where it is genuinely a
 * grouping, which is the product shelf.
 *
 * No rings, no streaks, no score. This is meant to remove thinking, not add a
 * game to washing your face.
 */
export default function CarePage() {
  // Read once on mount. The context belongs to Today; Care just inherits it.
  const [query, setQuery] = useState(() => ({
    mode: 'casual',
    environment: 'outdoor',
    plannedFor: 'now',
    tempC: null as number | null,
    humidity: null as number | null,
    condition: null as string | null,
  }));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const ctx = readTodayContext();
    const w = readCachedWeather();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery({
      mode: ctx?.mode ?? modeForDate(),
      environment: ctx?.environment ?? 'outdoor',
      plannedFor: ctx?.plannedFor ?? 'now',
      tempC: w?.temp_c ?? null,
      humidity: w?.humidity ?? null,
      condition: w?.condition ?? null,
    });
    setHydrated(true);
  }, []);

  const { state, loading, error, log, undo, patchProfile } = useCare(query, hydrated);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('routine');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const plan = state?.plan;
  const done = useMemo(() => new Set(plan?.doneKeys ?? []), [plan?.doneKeys]);

  const runStep = async (key: string, productId: string | null, domain: string) => {
    setBusy(true);
    setActionError(null);
    try {
      await log({
        action: key,
        domain: domain === 'skin' || domain === 'hair' || domain === 'body' ? domain : 'skin',
        product_id: productId,
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not log that.');
    } finally {
      setBusy(false);
    }
  };

  const remaining = (plan?.steps ?? []).filter((s) => !done.has(s.key));
  const allDone = Boolean(plan) && remaining.length === 0;

  const greeting =
    plan?.phase === 'evening' ? 'Good evening, Gaurav' : 'Good morning, Gaurav';

  return (
    <main className="min-h-dvh pb-4">
      <OneUIHeader
        title={loading || !plan ? 'Care' : greeting}
        subtitle={plan?.headline}
      />

      <div className="reach-zone">
        <div role="tablist" aria-label="Care view" className="grid grid-cols-2 gap-1 rounded-full bg-white/[0.05] p-1">
          {(['routine', 'products'] as Tab[]).map((t) => (
            <button
              key={t}
              role="tab"
              type="button"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                'press flex min-h-[48px] items-center justify-center rounded-full text-[14px] font-semibold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400',
                tab === t ? 'bg-crimson-400 text-white' : 'text-fog-300 hover:text-fog-100'
              )}
            >
              {t === 'routine' ? 'Routine' : 'Products'}
            </button>
          ))}
        </div>

        {actionError && (
          <div role="alert" className="rounded-[1.5rem] border border-error-border bg-error/40 px-4 py-3 text-oneui-body text-error-text">
            {actionError}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-squircle bg-white/[0.05]" />
            ))}
          </div>
        ) : error || !plan || !state ? (
          <div role="alert" className="rounded-[1.65rem] bg-ink-100 px-4 py-4">
            <p className="text-[15px] font-semibold leading-5 text-fog-100">Couldn&apos;t load your routine</p>
            <p className="mt-1 text-[13px] leading-5 text-fog-400">{error ?? 'No care profile set up yet.'}</p>
          </div>
        ) : tab === 'routine' ? (
          <>
            {plan.flags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {plan.flags.map((f) => (
                  <span
                    key={f}
                    className="inline-flex min-h-[32px] items-center rounded-full bg-crimson-400/[0.14] px-3 text-[12px] font-semibold text-crimson-200"
                  >
                    {f}
                  </span>
                ))}
              </div>
            )}

            {allDone ? (
              <div className="app-card flex items-center gap-3 p-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-crimson-400 text-white">
                  <Check size={22} strokeWidth={2.8} aria-hidden />
                </span>
                <div>
                  <p className="text-[16px] font-semibold text-fog-100">
                    {plan.phase === 'evening' ? 'Evening care done' : 'Morning care done'}
                  </p>
                  <p className="text-[13px] text-fog-400">Nothing else until tonight.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-baseline justify-between px-1">
                  <h2 className="section-title">Do now</h2>
                  <span className="section-meta">
                    {remaining.length} {remaining.length === 1 ? 'step' : 'steps'} · {plan.minutes} min
                  </span>
                </div>
                <ol className="flex flex-col gap-2.5">
                  {plan.steps.map((s, i) => (
                    <RoutineStep
                      key={s.key}
                      step={s}
                      order={i + 1}
                      done={done.has(s.key)}
                      busy={busy}
                      onDone={() => void runStep(s.key, s.productId, domainOf(s.key))}
                      onSkip={() => void runStep(s.key, s.productId, domainOf(s.key))}
                      onUndo={() => { setBusy(true); void undo(s.key).finally(() => setBusy(false)); }}
                    />
                  ))}
                </ol>
              </>
            )}

            <section aria-label="Next due" className="mt-2">
              <h2 className="section-title mb-2 px-1">Next due</h2>
              <ul className="flex flex-col gap-2">
                {plan.due.slice(0, 7).map((d) => (
                  <DueRow key={d.key} item={d} />
                ))}
              </ul>
            </section>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="press mt-1 inline-flex min-h-[48px] items-center justify-center self-start rounded-full px-4 text-[14px] font-semibold text-fog-300 transition-colors hover:text-fog-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
            >
              Adjust what the app assumes
            </button>
          </>
        ) : (
          <ProductShelves products={state.products} />
        )}
      </div>

      {state && (
        <OneUISheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title="What the app assumes">
          <div className="flex flex-col gap-5 pb-2">
            <section>
              <h3 className="mb-1 px-1 text-[15px] font-semibold text-fog-100">Dandruff right now</h3>
              <p className="mb-2.5 px-1 text-[12px] leading-5 text-fog-400">
                This decides how often the Minimalist shampoo comes out. A treatment shampoo used
                every wash is not better, it is just harsher.
              </p>
              <div role="radiogroup" aria-label="Dandruff" className="grid grid-cols-3 gap-1 rounded-full bg-white/[0.05] p-1">
                {(['active', 'occasional', 'none'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={state.profile.dandruff === v}
                    onClick={() => void patchProfile({ dandruff: v })}
                    className={cn(
                      'press flex min-h-[48px] items-center justify-center rounded-full text-[13px] font-semibold capitalize transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400',
                      state.profile.dandruff === v ? 'bg-crimson-400 text-white' : 'text-fog-300 hover:text-fog-100'
                    )}
                  >
                    {v === 'active' ? 'Flaking' : v === 'occasional' ? 'Sometimes' : 'None'}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-1 px-1 text-[15px] font-semibold text-fog-100">Ishita</h3>
              <button
                type="button"
                role="switch"
                aria-checked={state.profile.share_with_partner}
                onClick={() => void patchProfile({ share_with_partner: !state.profile.share_with_partner })}
                className="press flex min-h-[60px] w-full items-center justify-between gap-4 rounded-squircle border border-white/[0.07] bg-white/[0.04] px-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
              >
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold text-fog-100">Share the hair plan</span>
                  <span className="block text-[12px] leading-5 text-fog-400">
                    Only the hairstyle goal and next cut date. Never your routine, logs or photos.
                  </span>
                </span>
                <span
                  className={cn(
                    'relative h-7 w-12 shrink-0 rounded-full transition-colors',
                    state.profile.share_with_partner ? 'bg-crimson-400' : 'bg-white/[0.14]'
                  )}
                >
                  <span
                    className="absolute top-1 h-5 w-5 rounded-full bg-white transition-all duration-200"
                    style={{ left: state.profile.share_with_partner ? '26px' : '4px' }}
                  />
                </span>
              </button>
            </section>
          </div>
        </OneUISheet>
      )}
    </main>
  );
}

/** Which domain a step belongs to, for the log row. */
function domainOf(key: string): string {
  if (key === 'shampoo' || key === 'condition' || key === 'style') return 'hair';
  if (key === 'body_wash' || key === 'trim') return 'body';
  return 'skin';
}

function DueRow({ item }: { item: DueItem }) {
  const overdue = item.inDays !== null && item.inDays < 0;
  const today = item.inDays === 0;
  const when =
    item.inDays === null ? '—'
    : overdue ? `${Math.abs(item.inDays)}d over`
    : today ? 'Today'
    : item.inDays === 1 ? 'Tomorrow'
    : `${item.inDays}d`;

  const Icon = item.domain === 'hair' ? Scissors : item.domain === 'body' ? Droplets : Sparkles;

  return (
    <li className="app-card flex items-center gap-3 p-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-fog-300">
        <Icon size={16} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-fog-100">{item.label}</span>
        <span className="block truncate text-[12px] text-fog-400">{item.detail}</span>
      </span>
      <span
        className={cn(
          'shrink-0 text-[12px] font-semibold',
          overdue || today ? 'text-crimson-300' : 'text-fog-400'
        )}
      >
        {when}
      </span>
    </li>
  );
}

const DOMAIN_LABELS: Record<string, string> = {
  skin: 'Skin',
  hair: 'Hair',
  body: 'Body and tools',
};

function ProductShelves({ products }: { products: CareProduct[] }) {
  const owned = products.filter((p) => !p.wishlist);
  const gaps = products.filter((p) => p.wishlist);

  return (
    <div className="flex flex-col gap-6">
      {(['skin', 'hair', 'body'] as const).map((domain) => {
        const list = owned.filter((p) => p.domain === domain);
        if (list.length === 0) return null;
        return (
          <section key={domain} aria-label={DOMAIN_LABELS[domain]}>
            <div className="shelf-head">
              <h2 className="section-title">{DOMAIN_LABELS[domain]}</h2>
              <span className="section-meta">{list.length}</span>
            </div>
            <ul className="flex flex-col gap-2">
              {list.map((p) => (
                <li key={p.id} className="app-card p-3.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="min-w-0 truncate text-[15px] font-semibold text-fog-100">
                      {p.brand ? `${p.brand} ${p.name}` : p.name}
                    </h3>
                    <span className="shrink-0 text-[11px] font-medium capitalize text-fog-400">{p.kind}</span>
                  </div>
                  {p.directions && (
                    <p className="mt-1 text-[13px] leading-5 text-fog-300 text-pretty">{p.directions}</p>
                  )}
                  {p.amount && <p className="mt-1 text-[12px] font-medium text-fog-400">{p.amount}</p>}
                  {p.cautions.map((c) => (
                    <p key={c} className="mt-2 flex items-start gap-2 rounded-squircle-sm bg-white/[0.05] px-3 py-2 text-[12px] leading-5 text-fog-200">
                      <AlertTriangle size={13} className="mt-0.5 shrink-0 text-crimson-300" aria-hidden />
                      {c}
                    </p>
                  ))}
                  {p.needs_detail && (
                    <p className="mt-2 text-[12px] font-medium text-crimson-300">{p.needs_detail}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {gaps.length > 0 && (
        <section aria-label="Not owned yet">
          <div className="shelf-head">
            <h2 className="section-title">Worth buying</h2>
            <span className="section-meta">{gaps.length}</span>
          </div>
          <ul className="flex flex-col gap-2">
            {gaps.map((p) => (
              <li key={p.id} className="rounded-squircle border border-dashed border-white/[0.12] p-3.5">
                <h3 className="text-[15px] font-semibold text-fog-200">{p.name}</h3>
                {p.directions && (
                  <p className="mt-1 text-[13px] leading-5 text-fog-400 text-pretty">{p.directions}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
