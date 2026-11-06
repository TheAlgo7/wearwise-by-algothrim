import { describe, expect, it } from 'vitest';
import { buildCarePlan, type CareContext } from '@/lib/care/engine';
import { isMedicatedShampoo, pickHairKit, planWash, type WashState } from '@/lib/care/hair';
import type { CareLog, CarePlan, CareProduct, CareProfile } from '@/lib/care/types';

// ── Fixtures: his real rows as of 6 Nov 2026, trimmed to what matters ────────

/** A wall-clock time in Asia/Kolkata. */
const ist = (s: string) => new Date(`${s}+05:30`);

function product(
  p: Partial<CareProduct> & Pick<CareProduct, 'id' | 'name' | 'domain' | 'kind'>
): CareProduct {
  return {
    brand: null, step_order: null, actives: [], areas: [], amount: null, directions: null,
    frequency: 'as-needed', time_of_day: [], conflicts: [], cautions: [], image_url: null,
    opened_on: null, expires_on: null, wishlist: false, needs_detail: null, archived: false,
    created_at: '2026-08-06T02:58:24Z',
    ...p,
  };
}

const NEW = '2026-11-06T10:00:00Z';
const MINIMALIST = product({
  id: 'minimalist', brand: 'Minimalist', name: 'Anti-Dandruff Shampoo 3.5%', domain: 'hair', kind: 'shampoo',
  step_order: 1, actives: ['piroctone-olamine', 'climbazole', 'salicylic-acid'], frequency: 'by-symptom',
});
const GENTLE_GAP = product({
  id: 'gentle-gap', name: 'Gentle everyday shampoo', domain: 'hair', kind: 'shampoo', step_order: 1, wishlist: true,
});
const MOXIE_SHAMPOO = product({
  id: 'moxie-shampoo', brand: 'Moxie', name: 'Gentle Cleansing Shampoo (50 ml)', domain: 'hair', kind: 'shampoo',
  step_order: 1, created_at: NEW,
});
const LOREAL = product({
  id: 'loreal', brand: "L'Oreal Paris", name: 'Hyaluron Moisture Conditioner', domain: 'hair', kind: 'conditioner', step_order: 2,
});
const MOXIE_CONDITIONER = product({
  id: 'moxie-conditioner', brand: 'Moxie', name: 'Ultra Hydrating Conditioner (50 ml)', domain: 'hair',
  kind: 'conditioner', step_order: 2, created_at: NEW,
});
const CURL_CREAM = product({
  id: 'curl-cream', brand: 'Moxie', name: 'Super Defining Curl Cream (50 ml)', domain: 'hair', kind: 'styling',
  step_order: 0, created_at: NEW,
});
const SALT = product({ id: 'salt', brand: 'Arata', name: 'Sea Salt Thickening Hair Spray', domain: 'hair', kind: 'styling', step_order: 1 });
const POWDER = product({ id: 'powder', brand: 'UrbanGabru', name: 'Hair Volumizing Powder', domain: 'hair', kind: 'styling', step_order: 2 });
const CLAY = product({ id: 'clay', brand: 'Beardo', name: 'Hair Clay', domain: 'hair', kind: 'styling', step_order: 3 });
const HEAT_GAP = product({ id: 'heat-gap', name: 'Heat protectant spray', domain: 'hair', kind: 'styling', step_order: 0, wishlist: true });

// Skin and body, so the engine has a whole routine to build around the hair.
const SKIN_AND_BODY = [
  product({ id: 'cleanser', brand: 'SKIN1004', name: 'Centella Cleansing Foam', domain: 'skin', kind: 'cleanser' }),
  product({ id: 'serum', brand: 'SKIN1004', name: 'Centella Ampoule', domain: 'skin', kind: 'serum' }),
  product({ id: 'treatment', brand: 'Anua', name: 'Niacinamide + TXA Serum', domain: 'skin', kind: 'treatment' }),
  product({ id: 'moisturiser', brand: 'Dot & Key', name: '72HR Hydrating Gel', domain: 'skin', kind: 'moisturiser' }),
  product({ id: 'sunscreen', brand: 'Beauty of Joseon', name: 'Relief Sun', domain: 'skin', kind: 'sunscreen' }),
  product({ id: 'body-wash', name: 'Body wash', domain: 'body', kind: 'wash' }),
];

const ALL = [
  MINIMALIST, GENTLE_GAP, MOXIE_SHAMPOO, LOREAL, MOXIE_CONDITIONER, CURL_CREAM,
  SALT, POWDER, CLAY, HEAT_GAP, ...SKIN_AND_BODY,
];

const PROFILE: CareProfile = {
  id: 'profile', skin_type: 'oily-combination', skin_concerns: [], sensitivities: [],
  hair_type: 'fine-straight-silky', hair_hold: 'low', dandruff: 'occasional',
  hairstyle_goal: 'Messy, textured loose waves', growth_started_on: '2026-08-04', share_with_partner: true,
  perm_on: '2026-10-23T19:30:00+05:30', wash_min_days: 3, wash_max_days: 4,
};
const NATURAL: CareProfile = { ...PROFILE, perm_on: null };

let seq = 0;
function log(action: string, at: string, extra: Partial<CareLog> = {}): CareLog {
  return {
    id: `log-${++seq}`, action, domain: 'hair', area: 'scalp', product_id: null, note: null, severity: null,
    done_at: ist(at).toISOString(), ...extra,
  };
}

/** The wash he reported: 25 Oct 2026, 10 pm IST. */
const LAST_WASH = log('shampoo', '2026-10-25T22:00:00');
const OUT: CareContext = { mode: 'casual', environment: 'outdoor', plannedFor: 'now', tempC: 26, humidity: 40 };

// ── Owned shampoo selection ───────────────────────────────────────────────

describe('owned shampoo selection', () => {
  it('picks the owned gentle shampoo, never the wishlist gap', () => {
    const kit = pickHairKit(ALL);
    expect(kit.gentle?.id).toBe('moxie-shampoo');
    expect(kit.medicated?.id).toBe('minimalist');
  });

  it('keeps medicated and gentle apart whatever order the rows arrive in', () => {
    for (const rows of [ALL, [...ALL].reverse()]) {
      const kit = pickHairKit(rows);
      expect(kit.gentle?.id).toBe('moxie-shampoo');
      expect(kit.medicated?.id).toBe('minimalist');
    }
  });

  it('reports no gentle shampoo rather than using the wishlist row or the medicated one', () => {
    const kit = pickHairKit(ALL.filter((p) => p.id !== 'moxie-shampoo'));
    expect(kit.gentle).toBeNull();
    expect(kit.medicated?.id).toBe('minimalist');
  });

  it('ignores archived bottles', () => {
    const kit = pickHairKit(ALL.map((p) => (p.id === 'moxie-shampoo' ? { ...p, archived: true } : p)));
    expect(kit.gentle).toBeNull();
  });

  it('knows a medicated shampoo by its actives, not by where it sits in the list', () => {
    expect(isMedicatedShampoo(MINIMALIST)).toBe(true);
    expect(isMedicatedShampoo(MOXIE_SHAMPOO)).toBe(false);
    expect(isMedicatedShampoo(product({ id: 'k', name: 'Ketoconazole 2%', domain: 'hair', kind: 'shampoo' }))).toBe(true);
  });

  it('uses the newest conditioner and finds each styler by its job', () => {
    const kit = pickHairKit(ALL);
    expect(kit.conditioner?.id).toBe('moxie-conditioner');
    expect(kit.curlCream?.id).toBe('curl-cream');
    expect(kit.saltSpray?.id).toBe('salt');
    expect(kit.clay?.id).toBe('clay');
    expect(kit.powder?.id).toBe('powder');
    expect(kit.heatProtectantGap?.id).toBe('heat-gap');
  });
});

// ── Wash scheduling ───────────────────────────────────────────────────────

describe('wash scheduling', () => {
  const kit = pickHairKit(ALL);
  const plan = (at: string, logs: CareLog[] = [LAST_WASH], profile = PROFILE, ctx = OUT) =>
    planWash(profile, kit, logs, ctx, ist(at));

  it('counts calendar days in IST: a 10 pm wash is one day old at 9 am', () => {
    expect(plan('2026-10-26T09:00:00').since).toBe(1);
  });

  const table: Array<[string, WashState, number, boolean]> = [
    ['2026-10-26T20:00:00', 'rest', 2, false],
    ['2026-10-27T20:00:00', 'rest', 1, false],
    ['2026-10-28T20:00:00', 'open', 0, true],
    ['2026-10-29T20:00:00', 'due', 0, true],
    ['2026-10-31T20:00:00', 'overdue', -2, true],
  ];
  it.each(table)('on %s the wash is %s, in %i days, tonight %s', (at, state, inDays, tonight) => {
    const p = plan(at);
    expect(p.state).toBe(state);
    expect(p.inDays).toBe(inDays);
    expect(p.tonight).toBe(tonight);
  });

  it('makes day 3 of 3-4 his call and day 4 a must', () => {
    expect(plan('2026-10-28T20:00:00').optional).toBe(true);
    expect(plan('2026-10-29T20:00:00').optional).toBe(false);
  });

  it('says "unknown" instead of inventing an overdue count when the last log is old', () => {
    const p = plan('2026-11-06T10:00:00');
    expect(p.state).toBe('unknown');
    expect(p.inDays).toBeNull();
    expect(p.detail).toBe('Last logged 25 Oct');
    expect(p.optional).toBe(true);
  });

  it('follows his wash window setting', () => {
    const tighter = { ...PROFILE, wash_min_days: 2, wash_max_days: 3 };
    expect(plan('2026-10-27T20:00:00', [LAST_WASH], tighter).state).toBe('open');
    const looser = { ...PROFILE, wash_min_days: 4, wash_max_days: 5 };
    expect(plan('2026-10-28T20:00:00', [LAST_WASH], looser).state).toBe('rest');
  });

  it('falls back to 3-4 days when the profile has no window', () => {
    const old = { ...PROFILE, wash_min_days: undefined, wash_max_days: undefined };
    expect(plan('2026-10-28T20:00:00', [LAST_WASH], old).state).toBe('open');
  });

  it('allows a wash a day early after a sweaty day, without requiring it', () => {
    const gym = plan('2026-10-27T20:00:00', [LAST_WASH], PROFILE, { ...OUT, mode: 'gym' });
    expect(gym.state).toBe('early');
    expect(gym.tonight).toBe(true);
    expect(gym.optional).toBe(true);
    const hot = { ...OUT, tempC: 35 };
    expect(plan('2026-10-27T20:00:00', [LAST_WASH], PROFILE, hot).state).toBe('early');
    expect(plan('2026-10-27T20:00:00', [LAST_WASH], PROFILE, { ...hot, environment: 'indoor-ac' }).state).toBe('rest');
  });

  it('ignores showers: body-wash logs never move the wash date', () => {
    const showers = ['2026-10-26T08:00:00', '2026-10-27T08:00:00'].map((t) =>
      log('body_wash', t, { domain: 'body', area: null })
    );
    expect(plan('2026-10-27T20:00:00', [LAST_WASH, ...showers]).state).toBe('rest');
  });

  it('keeps a fresh perm dry for 72 hours, then counts from the perm', () => {
    const settling = plan('2026-10-25T09:00:00', []);
    expect(settling.state).toBe('settling');
    expect(settling.tonight).toBe(false);
    const after = plan('2026-10-26T20:00:00', []);
    expect(after.state).toBe('open');
    expect(after.since).toBe(3);
  });

  it("holds the medicated shampoo for the perm's first two weeks unless he is flaking", () => {
    const fresh = plan('2026-10-28T20:00:00');
    expect(fresh.treatment).toBe(false);
    expect(fresh.heldForPerm).toBe(true);
    expect(plan('2026-10-28T20:00:00', [LAST_WASH], { ...PROFILE, dandruff: 'active' }).treatment).toBe(true);
  });

  it('brings the medicated shampoo back on its schedule after that', () => {
    const gentleWash = log('shampoo', '2026-11-06T21:00:00', { product_id: 'moxie-shampoo' });
    expect(plan('2026-11-09T20:00:00', [LAST_WASH, gentleWash]).treatment).toBe(true);
    const medicatedWash = log('shampoo', '2026-11-03T21:00:00', { product_id: 'minimalist' });
    expect(plan('2026-11-09T20:00:00', [LAST_WASH, medicatedWash, gentleWash]).treatment).toBe(false);
    expect(plan('2026-11-09T20:00:00', [gentleWash], { ...PROFILE, dandruff: 'none' }).treatment).toBe(false);
  });
});

// ── The routine ───────────────────────────────────────────────────────────

describe('care plan', () => {
  const morning = (at: string, logs: CareLog[] = [LAST_WASH], profile = PROFILE, ctx = OUT) =>
    buildCarePlan(profile, ALL, logs, ctx, ist(at), 'morning');
  const evening = (at: string, logs: CareLog[] = [LAST_WASH], profile = PROFILE, ctx = OUT) =>
    buildCarePlan(profile, ALL, logs, ctx, ist(at), 'evening');
  const keys = (p: CarePlan) => p.steps.map((s) => s.key);

  it('never puts shampoo in the morning, shower or not', () => {
    for (const day of ['2026-10-28', '2026-10-29', '2026-10-31', '2026-11-06']) {
      const shower = log('body_wash', `${day}T07:30:00`, { domain: 'body', area: null });
      const p = morning(`${day}T08:00:00`, [LAST_WASH, shower]);
      expect(keys(p)).not.toContain('shampoo');
      expect(keys(p)).not.toContain('condition');
      expect(p.steps.find((s) => s.key === 'body_wash')?.why).toMatch(/not a hair wash/);
    }
  });

  it('offers an optional water refresh and makes all styling optional', () => {
    const p = morning('2026-11-06T08:00:00');
    expect(p.steps.find((s) => s.key === 'refresh')?.optional).toBe(true);
    const hair = p.steps.filter((s) => s.key === 'refresh' || s.key === 'style');
    expect(hair.length).toBe(2);
    expect(hair.every((s) => s.optional)).toBe(true);
  });

  it('runs shampoo, a 2 minute rinse-out conditioner and curl cream on a wash night', () => {
    const p = evening('2026-10-29T20:00:00');
    expect(keys(p).slice(0, 3)).toEqual(['shampoo', 'condition', 'curl_cream']);
    const [shampoo, conditioner, curlCream] = p.steps;
    expect(shampoo.productId).toBe('moxie-shampoo');
    expect(conditioner.productId).toBe('moxie-conditioner');
    expect(conditioner.detail).toBe('Rinse-out, 2 min');
    expect(curlCream.productId).toBe('curl-cream');
    expect(curlCream.detail).toBe('Pea-sized, on wet hair');
    expect([shampoo, conditioner, curlCream].every((s) => !s.optional)).toBe(true);
  });

  it('leaves the wash out on a rest night', () => {
    expect(keys(evening('2026-10-27T20:00:00'))).not.toContain('shampoo');
  });

  it('marks nothing done until he logs it', () => {
    expect(morning('2026-11-06T08:00:00').doneKeys).toEqual([]);
    expect(evening('2026-10-29T20:00:00').doneKeys).toEqual([]);
    const refreshed = morning('2026-11-06T09:00:00', [LAST_WASH, log('refresh', '2026-11-06T08:30:00')]);
    expect(refreshed.doneKeys).toEqual(['refresh']);
    const row = refreshed.due.find((d) => d.key === 'hair-refresh');
    expect(row?.detail).toBe('Done today');
    expect(row?.log).toBeUndefined();
  });

  it('lets one logged wash complete the whole wash, still listed for tonight', () => {
    const washed = log('shampoo', '2026-10-29T21:00:00', { product_id: 'moxie-shampoo' });
    const p = evening('2026-10-29T21:30:00', [LAST_WASH, washed]);
    expect(keys(p).slice(0, 3)).toEqual(['shampoo', 'condition', 'curl_cream']);
    expect(p.doneKeys).toEqual(expect.arrayContaining(['shampoo', 'condition', 'curl_cream']));
    expect(p.due.find((d) => d.key === 'hair-wash')?.detail).toBe('Washed today, next in 3-4 days');
  });

  it('logs the wash against the suggested shampoo and offers the other one', () => {
    const row = evening('2026-10-29T20:00:00').due.find((d) => d.key === 'hair-wash');
    expect(row?.log?.action).toBe('shampoo');
    expect(row?.log?.product_id).toBe('moxie-shampoo');
    expect(row?.log?.choices?.map((c) => c.label)).toEqual(['Gentle', 'Medicated']);
  });

  it('keeps the hair dry while the perm sets', () => {
    const p = morning('2026-10-24T08:00:00', []);
    expect(keys(p)).toContain('perm_settle');
    expect(keys(p)).not.toContain('refresh');
    expect(p.steps.find((s) => s.key === 'body_wash')?.why).toMatch(/shower cap/);
    expect(p.flags).toContain('Perm setting');
    expect(keys(evening('2026-10-24T20:00:00', []))).not.toContain('shampoo');
  });

  it('keeps the skin safety rule: no niacinamide the night of a shave', () => {
    const shave = log('shave', '2026-11-06T09:00:00', { domain: 'body', area: 'face' });
    const p = evening('2026-11-06T21:00:00', [LAST_WASH, shave]);
    expect(keys(p)).not.toContain('treat');
    expect(keys(p)).toContain('soothe');
  });

  it('keeps natural-hair styling as an option when there is no perm', () => {
    const p = morning('2026-10-28T08:00:00', [LAST_WASH], NATURAL);
    const style = p.steps.find((s) => s.key === 'style');
    expect(style?.title).toBe('Style');
    expect(style?.optional).toBe(true);
    expect(keys(p)).not.toContain('refresh');
    expect(keys(evening('2026-10-28T20:00:00', [LAST_WASH], NATURAL))).not.toContain('curl_cream');
  });
});
