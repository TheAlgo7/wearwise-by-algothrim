import { APP_TIMEZONE, localHour } from '@/lib/weather';
import { modeLabel } from '@/lib/today-context';
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

/** Fine straight hair gets oily quickly; this is the general wash interval. */
const WASH_INTERVAL_D = 2;
/** Treatment shampoo spacing. A medicated shampoo is not an everyday shampoo. */
const TREATMENT_SHAMPOO_D: Record<string, number | null> = {
  active: 3,
  occasional: 7,
  none: null,
};
const SHAVE_CADENCE_D = 4;
const AREA_CADENCE_D: Record<string, number> = {
  underarms: 10,
  intimate: 14,
  chest: 21,
  legs: 21,
};

/** How long a logged reaction keeps actives off the table. */
const REACTION_LOOKBACK_D = 3;
/** Ceiling on nights per week that get the niacinamide serum. */
const MAX_TREATMENT_NIGHTS = 3;
/** An active used this recently means tonight is a recovery night. */
const ACTIVE_COOLDOWN_H = 36;

/** Grow-out plan milestones. One-off dates rather than repeating cadences. */
const EDGE_CLEANUP_ON = '2026-08-20';
const SHAPE_CUT_ON = '2026-09-15';

/** Occasions worth protecting the skin for the night before. */
const EVENT_MODES = new Set(['impress', 'night']);

/** Modes that mean he is not leaving the house. */
const HOME_MODES = new Set(['home']);

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

/** Whole days from `now` until a plain YYYY-MM-DD date. */
function daysUntil(iso: string, now: Date): number {
  return Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86_400_000) - dayNumber(now);
}

function pluralDays(n: number): string {
  return `${n} ${n === 1 ? 'day' : 'days'}`;
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

  // ── Hair wash decision ──
  const antiDandruff = find(products, 'hair', 'shampoo');
  const gentleShampoo = find(products, 'hair', 'shampoo', { wishlist: true });
  const conditioner = find(products, 'hair', 'conditioner');

  const sinceWash = daysSince(logs, (l) => l.action === 'shampoo', now);
  const sinceTreatmentWash = daysSince(
    logs,
    (l) => l.action === 'shampoo' && l.product_id === antiDandruff?.id,
    now
  );
  const isWashDay = sinceWash === null || sinceWash >= WASH_INTERVAL_D;
  const treatmentGap = TREATMENT_SHAMPOO_D[profile.dandruff] ?? null;
  const useTreatmentShampoo =
    treatmentGap !== null && (sinceTreatmentWash === null || sinceTreatmentWash >= treatmentGap);

  // ── Products ──
  const cleanser = find(products, 'skin', 'cleanser');
  const soothing = find(products, 'skin', 'serum');
  const moisturiser = find(products, 'skin', 'moisturiser');
  const sunscreen = find(products, 'skin', 'sunscreen');
  const bodyWash = find(products, 'body', 'wash');
  const bodyLotion = find(products, 'body', 'moisturiser');
  const saltSpray = find(products, 'hair', 'styling', { order: 1 });
  const clay = find(products, 'hair', 'styling', { order: 3 });
  const heatProtectant = find(products, 'hair', 'styling', { wishlist: true, order: 0 });

  const flags: string[] = [];
  if (shavedToday) flags.push('Post-shave');
  if (recentReaction) flags.push('Skin recovery');
  if (eventTomorrow) flags.push('Event tomorrow');
  if (isWashDay) flags.push('Wash day');

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

    if (isWashDay) {
      if (useTreatmentShampoo) {
        steps.push(
          step('shampoo', 'Shampoo', antiDandruff,
            profile.dandruff === 'active'
              ? 'Treatment wash. Scalp only, twice a week while flaking is active.'
              : 'Treatment wash, about weekly. Scalp only, not the lengths.')
        );
      } else {
        steps.push(
          step('shampoo', 'Shampoo', gentleShampoo,
            'A normal wash day. The medicated shampoo is not meant for every wash.',
            { missing: 'You do not own a gentle everyday shampoo yet.' })
        );
      }
      steps.push(
        step('condition', 'Condition', conditioner,
          'Lengths and fringe only, never the scalp. Two to three minutes, then rinse properly.',
          { detail: 'Small amount, 2-3 min' })
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

    steps.push(
      step('body_wash', 'Shower', bodyWash,
        freshlyGroomed || shavedToday
          ? 'Hands only while the skin is still settling. No loofah on freshly groomed skin.'
          : loofahDay
          ? 'Loofah is fine today, gently. Let it dry out properly afterwards.'
          : 'Palms are enough. The loofah is a twice-a-week thing, not a daily one.',
        { detail: loofahDay && !freshlyGroomed && !shavedToday ? 'With the loofah' : 'Hands only' })
    );

    steps.push(
      step('body_moisturise', 'Body lotion', bodyLotion,
        freshlyGroomed || shavedToday
          ? 'While the skin is still damp. It is fragranced, so if a shaved patch stings, skip that patch rather than the whole step.'
          : 'Straight out of the shower, while the skin is still slightly damp. That is most of what makes it work.',
        { missing: bodyLotion ? undefined : 'No body moisturiser recorded yet.' })
    );

    if (!stayingHome) {
      steps.push(
        step('style', 'Style', saltSpray,
          'Damp hair, spray from a distance, lift the roots with your fingers while blow-drying, then a pea of clay from the back forward. The dryer makes the shape; the clay only holds it.',
          {
            detail: clay ? `Sea salt spray, blow-dry, then ${clay.name.toLowerCase()}` : undefined,
            missing: heatProtectant ? 'No heat protectant yet, and this routine blow-dries.' : undefined,
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

  if (!isWashDay && sinceWash !== null) {
    due.push({
      key: 'shampoo',
      label: WASH_INTERVAL_D - sinceWash === 1 ? 'Shampoo tomorrow' : 'Next wash',
      inDays: WASH_INTERVAL_D - sinceWash,
      detail: useTreatmentShampoo ? 'Treatment wash next' : 'Normal wash next',
      domain: 'hair',
    });
  }

  const sinceShave = daysSince(logs, (l) => l.action === 'shave' && l.area === 'face', now);
  if (sinceShave !== null) {
    due.push({
      key: 'shave',
      label: 'Clean shave',
      inDays: SHAVE_CADENCE_D - sinceShave,
      detail: sinceShave === 0 ? 'Done today' : `Last done ${pluralDays(sinceShave)} ago`,
      domain: 'body',
    });
  }

  for (const [area, cadence] of Object.entries(AREA_CADENCE_D)) {
    const since = daysSince(logs, (l) => l.action === 'trim' && l.area === area, now);
    if (since === null) continue;
    due.push({
      key: `trim-${area}`,
      label: `${area[0].toUpperCase()}${area.slice(1)}`,
      inDays: cadence - since,
      detail: since === 0 ? 'Done today' : `Last done ${pluralDays(since)} ago`,
      domain: 'body',
    });
  }

  const sinceHaircut = daysSince(logs, (l) => l.action === 'haircut', now);
  due.push({
    key: 'edge-cleanup',
    label: 'Edge clean-up',
    inDays: daysUntil(EDGE_CLEANUP_ON, now),
    detail: 'Sideburns, around the ears, nape. No top cutting, no fringe shortening.',
    domain: 'hair',
  });
  due.push({
    key: 'shape-cut',
    label: 'Shape cut',
    inDays: daysUntil(SHAPE_CUT_ON, now),
    detail:
      sinceHaircut !== null
        ? `Two-block shape, ${pluralDays(sinceHaircut)} into the grow-out.`
        : 'Two-block shape with the off-centre fringe.',
    domain: 'hair',
  });

  due.sort((a, b) => (a.inDays ?? 999) - (b.inDays ?? 999));

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

  const actionable = steps.filter((s) => !doneToday.has(s.key));

  return {
    phase,
    headline,
    flags,
    steps,
    // Roughly 90 seconds a step, rounded up, floored at 2 minutes.
    minutes: Math.max(2, Math.round((actionable.length * 1.5) / 0.5) * 0.5),
    due,
    doneKeys: steps.filter((s) => doneToday.has(s.key)).map((s) => s.key),
  };
}
