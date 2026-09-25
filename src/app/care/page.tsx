'use client';

import { CareCalendar } from '@/components/care/CareCalendar';
import { RoutineStep } from '@/components/care/RoutineStep';
import { OneUIHeader, OneUISheet } from '@/components/oneui';
import { useCare } from '@/hooks/useCare';
import { cn } from '@/lib/cn';
import { modeForDate } from '@/lib/modes';
import { readTodayContext } from '@/lib/today-context';
import { readCachedWeather } from '@/lib/weather-cache';
import type { CareProduct, CareStep, DueItem } from '@/lib/care/types';
import { AlertTriangle, CalendarDays, Check, Droplets, Loader2, Moon, Scissors, Sparkles, Sun } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type Tab = 'today' | 'calendar' | 'products';

/**
 * Care.
 *
 * Not a checklist. The first version put a tick circle on every step and he was
 * right to reject it: he does not want washing his face to have an unfinished
 * state, and nothing here is worth logging. It reads out instead — both
 * routines, morning and night, written plainly.
 *
 * "Next up" comes first because that is what he opened this screen looking for
 * and could not find: when the next shave, trim and haircut are due.
 *
 * No rings, no streaks, no score.
 */
export default function CarePage() {
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

  const { state, loading, error, patchProfile, log, undo } = useCare(query, hydrated);
  const [tab, setTab] = useState<Tab>('today');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [logging, setLogging] = useState<DueItem | null>(null);
  const [toast, setToast] = useState<{ text: string; id: string | null } | null>(null);

  // One toast at a time, gone after a few seconds unless he reaches for Undo.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const record = async (item: DueItem, when: Date) => {
    if (!item.log) return;
    const id = await log({ ...item.log, done_at: when.toISOString() });
    setLogging(null);
    setToast({ text: `${item.label} logged`, id });
  };

  const plan = state?.plan;
  const nowPhase = plan?.phase ?? 'morning';

  // Anything overdue or due within the week, most pressing first.
  const upcoming = useMemo(
    () => (plan?.due ?? []).filter((d) => d.inDays === null || d.inDays <= 21),
    [plan?.due]
  );

  const greeting = nowPhase === 'evening' ? 'Good evening, Gaurav' : 'Good morning, Gaurav';

  return (
    <main className="min-h-dvh pb-4">
      <OneUIHeader
        title={loading || !plan ? 'Care' : greeting}
        subtitle={plan?.headline}
      />

      <div className="reach-zone">
        <div role="tablist" aria-label="Care view" className="seg grid-cols-3">
          {(['today', 'calendar', 'products'] as Tab[]).map((t) => (
            <button
              key={t}
              role="tab"
              type="button"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className="seg-item"
            >
              {t === 'today' ? 'Today' : t === 'calendar' ? 'Calendar' : 'Products'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-squircle bg-white/[0.05]" />
            ))}
          </div>
        ) : error || !plan || !state ? (
          <div role="alert" className="rounded-[1.65rem] bg-ink-100 px-4 py-4">
            <p className="text-[15px] font-semibold leading-5 text-fog-100">Couldn&apos;t load your routine</p>
            <p className="mt-1 text-[13px] leading-5 text-fog-400">{error ?? 'No care profile set up yet.'}</p>
          </div>
        ) : tab === 'today' ? (
          <>
            {plan.flags.filter((f) => f !== 'Wash day').length > 0 && (
              <div className="flex flex-wrap gap-2">
                {plan.flags.filter((f) => f !== 'Wash day').map((f) => (
                  <span
                    key={f}
                    className="inline-flex min-h-[32px] items-center rounded-full bg-crimson-400/[0.14] px-3 text-[12px] font-semibold text-crimson-200"
                  >
                    {f}
                  </span>
                ))}
              </div>
            )}

            {/* What he came here to find */}
            <section aria-label="Next up">
              <div className="shelf-head">
                <h2 className="section-title">Next up</h2>
                <span className="section-meta">Tap one when it&apos;s done</span>
              </div>
              <ul className="app-card divide-y divide-white/[0.05] px-2">
                {upcoming.map((d) => (
                  <DueRow key={d.key} item={d} onLog={d.log ? () => setLogging(d) : undefined} />
                ))}
              </ul>
            </section>

            <Routine
              title="This morning"
              icon={<Sun size={15} aria-hidden />}
              steps={state.morning?.steps ?? []}
              muted={nowPhase !== 'morning'}
            />
            <Routine
              title="Tonight"
              icon={<Moon size={15} aria-hidden />}
              steps={state.evening?.steps ?? []}
              muted={nowPhase !== 'evening'}
            />

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="press inline-flex min-h-[48px] items-center justify-center self-start rounded-full px-4 text-[14px] font-semibold text-fog-300 transition-colors hover:text-fog-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
            >
              Adjust what the app assumes
            </button>
          </>
        ) : tab === 'calendar' ? (
          <CareCalendar logs={state.logs} due={plan.due} />
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
                Decides how often the Minimalist shampoo comes out. A treatment shampoo used every
                wash is not better, just harsher.
              </p>
              <div role="radiogroup" aria-label="Dandruff" className="seg grid-cols-3">
                {(['active', 'occasional', 'none'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={state.profile.dandruff === v}
                    onClick={() => void patchProfile({ dandruff: v })}
                    className="seg-item text-[13px]"
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
                  <span className="block text-[15px] font-semibold text-fog-100">Share your grooming dates</span>
                  <span className="block text-[12px] leading-5 text-fog-400">
                    She sees haircut, shave and trim timing. Never products, routines or photos.
                  </span>
                </span>
                <span
                  className={cn(
                    'relative h-7 w-12 shrink-0 rounded-full transition-colors',
                    state.profile.share_with_partner ? 'bg-crimson-400' : 'bg-white/[0.14]'
                  )}
                >
                  <span
                    className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform duration-200"
                    style={{ transform: state.profile.share_with_partner ? 'translateX(22px)' : 'none' }}
                  />
                </span>
              </button>
            </section>
          </div>
        </OneUISheet>
      )}

      {/* Keyed, so each item opens on a fresh sheet rather than the last one's state. */}
      <LogSheet key={logging?.key ?? 'closed'} item={logging} onClose={() => setLogging(null)} onRecord={record} />

      {toast && (
        <div
          role="status"
          className="animate-oneui-pop fixed inset-x-4 z-[60] mx-auto flex max-w-md items-center gap-3 rounded-full border border-white/[0.08] bg-ink-300 py-1.5 pl-5 pr-1.5 shadow-oneui-raised"
          style={{ bottom: 'calc(96px + env(safe-area-inset-bottom))' }}
        >
          <Check size={16} className="shrink-0 text-crimson-300" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-fog-100">{toast.text}</span>
          {toast.id && (
            <button
              type="button"
              onClick={() => {
                const id = toast.id!;
                setToast(null);
                void undo({ id }).catch(() => setToast({ text: 'Could not undo that', id: null }));
              }}
              className="press min-h-[44px] shrink-0 rounded-full px-4 text-[14px] font-semibold text-crimson-200 transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
            >
              Undo
            </button>
          )}
        </div>
      )}
    </main>
  );
}

/**
 * "When did you do it?" Three answers cover almost every case: today,
 * yesterday, or a date he picks. Backfilling matters because the log went
 * quiet for weeks; one honest tap per item brings every date back to true.
 */
function LogSheet({
  item, onClose, onRecord,
}: {
  item: DueItem | null;
  onClose: () => void;
  onRecord: (item: DueItem, when: Date) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState('');

  // One clock read per sheet, so today, yesterday and the picker's range agree.
  const [now] = useState(() => Date.now());
  const istDay = (t: number) => new Date(t).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const todayIso = istDay(now);
  const yesterdayIso = istDay(now - 86_400_000);
  const earliestIso = istDay(now - 119 * 86_400_000);

  const go = async (when: Date) => {
    if (!item || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await onRecord(item, when);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not log that');
      setBusy(false);
    }
  };

  // Midday IST on the chosen day, so the date never slips across midnight.
  const atNoonIst = (iso: string) => new Date(`${iso}T12:00:00+05:30`);

  return (
    <OneUISheet open={item !== null} onClose={onClose} title={item?.label ?? 'Log it'}>
      {item && (
        <div className="flex flex-col gap-4 pb-1">
          <p className="px-1 text-[14px] leading-5 text-fog-300 text-pretty">
            {item.stale
              ? `${item.detail}. When did you last do it?`
              : item.detail}
          </p>

          <button
            type="button"
            disabled={busy}
            onClick={() => void go(new Date())}
            className="press flex h-14 w-full items-center justify-center gap-2 rounded-full bg-crimson-400 text-[16px] font-semibold text-white transition-colors hover:bg-crimson-500 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-100"
          >
            {busy ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Check size={18} strokeWidth={2.3} aria-hidden />}
            Done today
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void go(atNoonIst(yesterdayIso))}
              className="press flex h-12 items-center justify-center rounded-full bg-white/[0.07] text-[15px] font-semibold text-fog-100 transition-colors hover:bg-white/[0.11] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
            >
              Yesterday
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setPicking((v) => !v)}
              aria-expanded={picking}
              className="press flex h-12 items-center justify-center gap-1.5 rounded-full bg-white/[0.07] text-[15px] font-semibold text-fog-100 transition-colors hover:bg-white/[0.11] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
            >
              <CalendarDays size={16} aria-hidden />
              Earlier
            </button>
          </div>

          {picking && (
            <div className="animate-oneui-fade flex items-center gap-2">
              <label htmlFor="care-log-date" className="sr-only">Date it was done</label>
              <input
                id="care-log-date"
                type="date"
                value={picked}
                min={earliestIso}
                max={todayIso}
                onChange={(e) => setPicked(e.target.value)}
                className="h-12 min-w-0 flex-1 rounded-squircle-sm border border-white/[0.08] bg-ink-200 px-4 text-[15px] text-fog-100 outline-none [color-scheme:dark] focus:border-crimson-400"
              />
              <button
                type="button"
                disabled={busy || !picked}
                onClick={() => void go(atNoonIst(picked))}
                className="press h-12 shrink-0 rounded-full bg-white/[0.12] px-5 text-[15px] font-semibold text-fog-100 transition-colors hover:bg-white/[0.16] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
              >
                Save
              </button>
            </div>
          )}

          {err && (
            <p role="alert" className="px-1 text-[13px] text-error-text">{err}</p>
          )}
        </div>
      )}
    </OneUISheet>
  );
}

function Routine({
  title, icon, steps, muted,
}: { title: string; icon: React.ReactNode; steps: CareStep[]; muted: boolean }) {
  if (steps.length === 0) return null;
  return (
    <section aria-label={title} className="mt-1">
      <div className="shelf-head">
        <h2 className="section-title flex items-center gap-2">
          <span className={muted ? 'text-fog-500' : 'text-crimson-300'}>{icon}</span>
          {title}
        </h2>
        <span className="section-meta">{steps.length} steps</span>
      </div>
      <ol className={cn('app-card px-4 pt-4', muted && 'opacity-75')}>
        {steps.map((s, i) => (
          <RoutineStep key={s.key} step={s} order={i + 1} muted={muted} />
        ))}
      </ol>
    </section>
  );
}

function DueRow({ item, onLog }: { item: DueItem; onLog?: () => void }) {
  const overdue = !item.stale && item.inDays !== null && item.inDays < 0;
  const today = !item.stale && item.inDays === 0;
  const when =
    item.stale ? null
    : item.inDays === null ? null
    : overdue ? `${Math.abs(item.inDays)}d over`
    : today ? 'Today'
    : item.inDays === 1 ? 'Tomorrow'
    : `in ${item.inDays}d`;

  const Icon = item.domain === 'hair' ? Scissors : item.domain === 'body' ? Droplets : Sparkles;

  const body = (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-fog-300">
        <Icon size={15} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-fog-100">{item.label}</span>
        <span className="block truncate text-[12px] text-fog-400">{item.detail}</span>
      </span>
      {item.stale ? (
        // Unknown, not overdue: an invitation, not an alarm.
        <span className="shrink-0 rounded-full bg-white/[0.07] px-3 py-1.5 text-[12px] font-semibold text-fog-200">
          Log it
        </span>
      ) : when ? (
        <span
          className={cn(
            'shrink-0 text-[12px] font-semibold tabular-nums',
            overdue || today ? 'text-crimson-300' : 'text-fog-400'
          )}
        >
          {when}
        </span>
      ) : null}
    </>
  );

  return (
    <li>
      {onLog ? (
        <button
          type="button"
          onClick={onLog}
          aria-label={`${item.label}. ${item.detail}.${when ? ` ${when}.` : ''} Log it`}
          className="press flex min-h-[60px] w-full items-center gap-3 rounded-[16px] px-2 py-2.5 text-left transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
        >
          {body}
        </button>
      ) : (
        <div className="flex min-h-[60px] items-center gap-3 px-2 py-2.5">{body}</div>
      )}
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
