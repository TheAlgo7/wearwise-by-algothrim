import { APP_TIMEZONE, localHour } from '@/lib/weather';
import { modeLabel } from '@/lib/today-context';
import { groomingDue } from '@/lib/care/grooming';
import { permSettleText, permState, pickHairKit, planWash, washDueItem } from '@/lib/care/hair';
import type {
  CareLog, CarePlan, CareProduct, CareProfile, CareStep, DueItem, Phase,
} from '@/lib/care/types';

/**
 * The care engine is deterministic on purpose.
 *
 * Outfit generation earns a model call: the answer is genuinely open-ended and
 * changes with 105 items, the weather and the occasion. "Wash your face, then
 * moisturise" does not. Putting an LLM in front of a four-step routine every
 * morning would add seconds of latency and a bill to something a lookup table
 * answers correctly every time.
 *
 * AI belongs in this feature only where the question is actually open: reading
 * a new product's ingredients off a photo, or reasoning about an unusual week.
 * Not here.
 *
 * Everything below is a pure function of (profile, products, logs, context,
 * now). No fetches, no randomness, testable in isolation.
 */

// ── Cadences ──────────────────────────────────────────────────────────────
// Starting points, not medical instructions. Each is overridable per area once
// the logs show what his skin and hair actually tolerate.

// The hair wash window and the treatment-shampoo spacing live in ./hair; the
// window is his own setting (every 3-4 days to start). Shave, trim and haircut
// cadences live in ./grooming, shared with Ishita's card.

/** How long a logged reaction keeps actives off the table. */
const REACTION_LOOKBACK_D = 3;
/** Ceiling on nights per week that get the niacinamide serum. */
const MAX_TREATMENT_NIGHTS = 3;
/** An active used this recently means tonight is a recovery night. */
const ACTIVE_COOLDOWN_H = 36;

/** Occasions worth protecting the skin for the night before. */
const EVENT_MODES = new Set(['impress', 'night']);

/** Modes that mean he is not leaving the house. */
const HOME_MODES = new Set(['home']);

/** Steps finished by a different logged action: one logged wash covers the whole wash. */
const COMPLETED_BY: Record<string, string> = {
  condition: 'shampoo',
  curl_cream: 'shampoo',
};

export interface CareContext {
  mode: string;
  environment: 'outdoor' | 'indoor-ac';
  plannedFor: 'now' | 'tonight' | 'tomorrow';
  tempC?: number | null;
  humidity?: number | null;
  condition?: string | null;
}

// ── Small helpers ─────────────────────────────────────────────────────────

function dayKey(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
}

/** Calendar day index in the app's timezone, so arithmetic counts sleeps. */
function dayNumber(d: Date): number {
  return Math.floor(Date.parse(`${dayKey(d)}T00:00:00Z`) / 86_400_000);
}

/**
 * Whole calendar days between two moments, in Asia/Kolkata.
 *
 * Deliberately not `(to - from) / 86400000`. He shaved at noon on the 4th; at
 * 10am on the 6th that is 46 hours, which floors to "1 day ago" while every
 * human counts two. Cadences built on the elapsed-hours version drift a day
 * late and the copy reads wrong.
 */
function daysBetween(from: Date, to: Date): number {
  return dayNumber(to) - dayNumber(from);
}

function latest(logs: CareLog[], match: (l: CareLog) => boolean): CareLog | null {
  let best: CareLog | null = null;
  for (const l of logs) {
    if (!match(l)) continue;
    if (!best || l.done_at > best.done_at) best = l;
  }
  return best;
}

function daysSince(logs: CareLog[], match: (l: CareLog) => boolean, now: Date): number | null {
  const l = latest(logs, match);
  return l ? daysBetween(new Date(l.done_at), now) : null;
}

function find(
  products: CareProduct[],
  domain: string,
  kind: string,
  opts: { wishlist?: boolean; order?: number } = {}
): CareProduct | null {
  const wishlist = opts.wishlist ?? false;
  return (
    products.find(
      (p) =>
        !p.archived &&
        p.domain === domain &&
        p.kind === kind &&
        p.wishlist === wishlist &&
        (opts.order === undefined || p.step_order === opts.order)
    ) ?? null
  );
}

function step(
  key: string,
  title: string,
  product: CareProduct | null,
  why: string,
  opts: { optional?: boolean; detail?: string; missing?: string } = {}
): CareStep {
  return {
    key,
    title,
    productId: product?.id ?? null,
    productName: product ? [product.brand, product.name].filter(Boolean).join(' ') : null,
    detail: opts.detail ?? product?.amount ?? null,
    why,
    optional: opts.optional ?? false,
    missing: opts.missing ?? null,
  };
}

// ── The plan ──────────────────────────────────────────────────────────────

export function buildCarePlan(
  profile: CareProfile,
  products: CareProduct[],
  logs: CareLog[],
  ctx: CareContext,
  now: Date = new Date(),
  /** Force a phase. The screen shows both routines, not just the current one. */
  phaseOverride?: Phase
): CarePlan {
  const hour = localHour(now);
  const phase: Phase = phaseOverride ?? (hour < 17 ? 'morning' : 'evening');
  const today = dayKey(now);
  const doneToday = new Set(
    logs.filter((l) => dayKey(new Date(l.done_at)) === today).map((l) => l.action)
  );
  // Only a log completes a step. One logged wash covers the whole wash.
  const isDone = (key: string) =>
    doneToday.has(key) || (COMPLETED_BY[key] !== undefined && doneToday.has(COMPLETED_BY[key]));

  const stayingHome = HOME_MODES.has(ctx.mode) || ctx.environment === 'indoor-ac';

  // ── State the routine reacts to ──
  const shavedToday = logs.some(
    (l) => l.action === 'shave' && dayKey(new Date(l.done_at)) === today
  );
  const reactionDays = daysSince(logs, (l) => l.action === 'reaction', now);
  const recentReaction = reactionDays !== null && reactionDays <= REACTION_LOOKBACK_D;

  const treatment = find(products, 'skin', 'treatment');
  const lastTreatment = latest(logs, (l) => l.action === 'treat');
  const activeRecently =
    lastTreatment !== null &&
    now.getTime() - new Date(lastTreatment.done_at).getTime() < ACTIVE_COOLDOWN_H * 3_600_000;
  const treatmentsThisWeek = logs.filter(
    (l) => l.action === 'treat' && daysBetween(new Date(l.done_at), now) < 7
  ).length;

  const eventTomorrow = ctx.plannedFor === 'tomorrow' && EVENT_MODES.has(ctx.mode);

  // ── Hair ──
  // Owned bottles only, medicated and gentle kept apart. The wash is an
  // evening job on a window he sets; showering has no say in it.
  const kit = pickHairKit(products);
  const perm = permState(profile, now);
  const wash = planWash(profile, kit, logs, ctx, now);

  // ── Products ──
  const cleanser = find(products, 'skin', 'cleanser');
  const soothing = find(products, 'skin', 'serum');
  const moisturiser = find(products, 'skin', 'moisturiser');
  const sunscreen = find(products, 'skin', 'sunscreen');
  const bodyWash = find(products, 'body', 'wash');
  const bodyLotion = find(products, 'body', 'moisturiser');

  const flags: string[] = [];
  if (shavedToday) flags.push('Post-shave');
  if (recentReaction) flags.push('Skin recovery');
  if (eventTomorrow) flags.push('Event tomorrow');
  if (perm?.settling) flags.push('Perm setting');
  if (wash.tonight && !wash.optional) flags.push('Wash day');

  const steps: CareStep[] = [];

  if (phase === 'morning') {
    // Cleansing. A water rinse is genuinely enough on a day indoors.
    if (stayingHome) {
      steps.push(
        step('cleanse', 'Rinse or cleanse', cleanser,
          'Indoors all day there is little to remove. Cleanse only if you woke up oily or slept warm.',
          { optional: true, detail: 'Water is fine, or pea-sized if oily' })
      );
    } else {
      steps.push(step('cleanse', 'Cleanse', cleanser, 'Clears the night off before anything goes on.'));
    }

    steps.push(
      step('soothe', 'Centella', soothing,
        shavedToday
          ? 'Soothing rather than active, which is what shaved skin wants.'
          : 'Light hydration under the moisturiser.',
        { detail: '2-3 drops, pat in' })
    );

    steps.push(
      step('moisturise', 'Moisturise', moisturiser,
        shavedToday
          ? 'Moisturiser matters most right after a shave. This one has fragrance, so if it stings, stop and go minimal.'
          : 'Seals the hydration in and keeps the oily-combination balance sensible.')
    );

    if (stayingHome) {
      steps.push(
        step('sunscreen', 'Sunscreen', sunscreen,
          'Only if you will get real daylight: sitting by a window, driving, or stepping out unexpectedly.',
          { optional: true })
      );
    } else {
      steps.push(
        step('sunscreen', 'Sunscreen', sunscreen,
          'Face, ears and neck. Not optional on a niacinamide routine, and reapply if you are out for hours.',
          { detail: 'Two fingers' })
      );
    }

    // ── Body ──
    // Shower, then lotion. Both products are fragranced, which is fine most
    // days and the wrong idea on skin that was shaved this week.
    const sinceAnyTrim = daysSince(logs, (l) => l.action === 'trim', now);
    const freshlyGroomed = sinceAnyTrim !== null && sinceAnyTrim <= 2;
    const loofahDay =
      !freshlyGroomed && !shavedToday &&
      (daysSince(logs, (l) => l.action === 'exfoliate', now) ?? 99) >= 4;

    // The shower is a body step. It never makes a hair wash due, and on the
    // perm's first days it has to keep the hair dry.
    const hairInShower = perm?.settling
      ? ` Keep your hair out of the water until ${permSettleText(perm)}: a shower cap does it.`
      : ' Body only. A shower is not a hair wash.';

    steps.push(
      step('body_wash', 'Shower', bodyWash,
        (freshlyGroomed || shavedToday
          ? 'Hands only while the skin is still settling. No loofah on freshly groomed skin.'
          : loofahDay
          ? 'Loofah is fine today, gently. Let it dry out properly afterwards.'
          : 'Palms are enough. The loofah is a twice-a-week thing, not a daily one.') + hairInShower,
        { detail: loofahDay && !freshlyGroomed && !shavedToday ? 'With the loofah' : 'Hands only' })
    );

    steps.push(
      step('body_moisturise', 'Body lotion', bodyLotion,
        freshlyGroomed || shavedToday
          ? 'While the skin is still damp. It is fragranced, so if a shaved patch stings, skip that patch rather than the whole step.'
          : 'Straight out of the shower, while the skin is still slightly damp. That is most of what makes it work.',
        { missing: bodyLotion ? undefined : 'No body moisturiser recorded yet.' })
    );

    // ── Hair ──
    // Nothing here is mandatory any more. The perm makes the shape, so the
    // old salt spray, blow-dry and clay routine is an option, not a duty.
    if (perm?.settling) {
      steps.push(
        step('perm_settle', 'Leave the perm alone', null,
          `No water, no product, nothing tied back or tucked behind the ears until ${permSettleText(perm)}. The new shape is still setting.`)
      );
    } else if (perm) {
      steps.push(
        step('refresh', 'Water refresh', null,
          'Wet hands or a mist of water, scrunch the waves up from the ends, then hands off while they dry. No shampoo, whether or not you showered.',
          { optional: true, detail: 'Water only, air-dry' })
      );
      // Salt and heat wait out the first two weeks of a perm.
      const texture = [
        kit.saltSpray && `${kit.saltSpray.brand ?? ''} salt spray, 2-3 sprays on damp hair`.trim(),
        kit.clay && `${kit.clay.brand ?? ''} clay, a rice grain in the ends`.trim(),
        kit.powder && `${kit.powder.brand ?? ''} powder at the roots`.trim(),
      ].filter((s): s is string => Boolean(s));
      if (!stayingHome && !perm.fresh && texture.length > 0) {
        steps.push(
          step('style', 'Extra texture', null,
            'Only if you want more grit. The perm makes the shape now, so there is no blow-dry and nothing has to go on. Pick one, not all three; salt dries permed hair, so not every day.',
            { optional: true, detail: texture.join(', or ') })
        );
      }
    } else if (!stayingHome) {
      // Natural texture: the old styling routine, kept as an option.
      steps.push(
        step('style', 'Style', kit.saltSpray,
          'Only if you want the shape. Damp hair, spray from a distance, lift the roots with your fingers while blow-drying, then a pea of clay from the back forward. The dryer makes the shape; the clay only holds it.',
          {
            optional: true,
            detail: kit.clay ? `Sea salt spray, blow-dry, then ${kit.clay.name.toLowerCase()}` : undefined,
            missing: kit.heatProtectantGap ? 'No heat protectant yet, and this blow-dries.' : undefined,
          })
      );
    } else {
      steps.push(
        step('style', 'Leave the hair alone', null,
          'A day at home is a product-free day for your scalp. Mist the fringe, part it off-centre, let it dry.',
          { optional: true })
      );
    }
  } else {
    // ── Hair wash ──
    // Evenings, on his window. Shampoo, a rinse-out conditioner, and on permed
    // hair a little curl cream while it is still wet.
    if (wash.tonight) {
      const shampoo = wash.treatment ? kit.medicated : kit.gentle;
      const optional = wash.optional;
      steps.push(
        step('shampoo', wash.treatment ? 'Treatment shampoo' : 'Shampoo', shampoo,
          wash.treatment
            ? `${wash.reason} Treatment night, scalp only: work it in, leave it two or three minutes, rinse well. The lengths get conditioner straight after.`
            : `${wash.reason} Fingertips on the scalp only; the rinse is enough for the lengths.${
                wash.heldForPerm ? ' The medicated one waits until the perm is two weeks old.' : ''
              }`,
          {
            optional,
            detail: wash.treatment ? 'Coin-sized, scalp only' : 'Small coin, scalp only',
            missing: shampoo ? undefined : 'You do not own a gentle everyday shampoo yet.',
          })
      );
      steps.push(
        step('condition', 'Conditioner', kit.conditioner,
          'Mid-lengths to ends, never the scalp. Two minutes, then rinse it out.',
          {
            optional,
            detail: 'Rinse-out, 2 min',
            missing: kit.conditioner ? undefined : 'No rinse-out conditioner recorded.',
          })
      );
      if (perm) {
        steps.push(
          step('curl_cream', 'Curl cream', kit.curlCream,
            `Straight onto wet hair: smooth it over the lengths, scrunch upward, then hands off until it is dry. Fine hair needs very little; too much and the waves drop flat. On a late wash, let it dry most of the way before bed or it sets flat.${
              perm.fresh ? ' No heat in the first two weeks.' : ' A diffuser on low is fine when you are short of time.'
            }`,
            {
              optional,
              detail: 'Pea-sized, on wet hair',
              missing: kit.curlCream ? undefined : 'No curl cream recorded yet.',
            })
        );
      }
    }

    steps.push(step('cleanse', 'Cleanse', cleanser, 'Everything from the day, including sunscreen, comes off first.'));

    const recoveryNight =
      shavedToday || recentReaction || activeRecently || eventTomorrow ||
      treatmentsThisWeek >= MAX_TREATMENT_NIGHTS;

    if (recoveryNight) {
      const reason = shavedToday
        ? 'You shaved today. Niacinamide over freshly shaved skin is how a routine starts stinging.'
        : recentReaction
        ? 'You logged a reaction in the last few days. Nothing active until it settles.'
        : eventTomorrow
        ? 'Something that matters tomorrow. Tonight is the wrong night to try anything on your face.'
        : activeRecently
        ? 'You used the serum last night. Alternate rather than stack.'
        : `Already ${treatmentsThisWeek} treatment nights this week. That is the ceiling while you are building tolerance.`;
      steps.push(step('soothe', 'Centella', soothing, reason, { detail: '2-3 drops, pat in' }));
    } else {
      steps.push(
        step('treat', 'Treatment serum', treatment,
          'Niacinamide and tranexamic acid for the uneven tone. Sunscreen tomorrow is part of the deal.',
          { detail: '2-3 drops, before moisturiser' })
      );
    }

    steps.push(step('moisturise', 'Moisturise', moisturiser, 'Last step. Face and neck.'));
  }

  // ── What is coming up ──
  const due: DueItem[] = [];

  // The wash is always listed, so it can always be logged, including the
  // "I washed it on Tuesday" backfill that brings an unknown date back.
  due.push(washDueItem(wash, kit));

  // Mornings on permed hair: an optional refresh, logged with one tap. It
  // only counts as done once he logs it.
  if (phase === 'morning' && perm && !perm.settling) {
    const refreshed = doneToday.has('refresh');
    due.push({
      key: 'hair-refresh',
      label: 'Morning refresh',
      inDays: null,
      detail: refreshed ? 'Done today' : 'Optional · water, scrunch, air-dry',
      domain: 'hair',
      log: refreshed ? undefined : { action: 'refresh', area: 'scalp', domain: 'hair', instant: true },
    });
  }

  // Shave, trims and haircuts: shared with Ishita's card so the two can never
  // disagree, and aware of when a date has gone stale rather than overdue.
  due.push(...groomingDue(logs, now));

  due.sort(
    (a, b) => Number(Boolean(a.stale)) - Number(Boolean(b.stale)) || (a.inDays ?? 999) - (b.inDays ?? 999)
  );

  // ── Headline ──
  const weatherWord =
    typeof ctx.humidity === 'number' && ctx.humidity >= 70
      ? 'Humid'
      : /rain|drizzle|shower|thunder/i.test(ctx.condition ?? '')
      ? 'Wet'
      : typeof ctx.tempC === 'number' && ctx.tempC >= 38
      ? 'Very hot'
      : typeof ctx.tempC === 'number' && ctx.tempC <= 12
      ? 'Cold'
      : null;

  const headline = [
    modeLabel(ctx.mode),
    stayingHome ? 'Staying home' : 'Going out',
    weatherWord,
  ].filter(Boolean).join(' · ');

  const actionable = steps.filter((s) => !isDone(s.key));

  return {
    phase,
    headline,
    flags,
    steps,
    // Roughly 90 seconds a step, rounded up, floored at 2 minutes.
    minutes: Math.max(2, Math.round((actionable.length * 1.5) / 0.5) * 0.5),
    due,
    doneKeys: steps.filter((s) => isDone(s.key)).map((s) => s.key),
  };
}
