/**
 * WearWise engine behaviour test harness.
 *
 * Hits /api/generate across the full mode matrix and validates each outfit
 * against the mode's gate rules using real item metadata from Supabase.
 * Automated version of the manual bug-report test sessions.
 *
 * Usage: node scripts/engine-test.mjs [baseUrl]
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const BASE = process.argv[2] ?? 'http://localhost:3000';

// Load env from .env.local
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].trim();
}

const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: itemRows, error } = await supa.from('items').select('*, category:categories(*)');
if (error) { console.error('Supabase items fetch failed:', error.message); process.exit(1); }
const items = new Map(itemRows.map((i) => [i.id, i]));
console.log(`Loaded ${items.size} wardrobe items for validation\n`);

const CLOTHING_TOP = new Set(['base', 'mid', 'outer']);

/** Test definitions: payload + expectations */
const TESTS = [
  {
    name: 'Quick · Outdoor · Now',
    body: { mode: 'quick', environment: 'outdoor', planned_for: 'now' },
  },
  {
    name: 'Home · Indoor AC',
    body: { mode: 'home', environment: 'indoor-ac', planned_for: 'now' },
    rules: { maxFormality: 2, excludedLayers: ['timepiece'] },
  },
  {
    name: 'Smart · Indoor AC · Tonight',
    body: { mode: 'smart', environment: 'indoor-ac', planned_for: 'tonight' },
    rules: { minFormality: 3, excludedVibes: ['gym', 'lounge'] },
  },
  {
    name: 'Gym · Outdoor',
    body: { mode: 'gym', environment: 'outdoor', planned_for: 'now' },
    rules: { maxFormality: 2 },
  },
  {
    name: 'Church · Outdoor',
    body: { mode: 'church', environment: 'outdoor', planned_for: 'now' },
    rules: { minFormality: 3, excludedVibes: ['gym', 'lounge', 'party'] },
  },
  {
    name: 'Impress · Outdoor',
    body: { mode: 'impress', environment: 'outdoor', planned_for: 'now' },
    rules: { minFormality: 2 },
  },
  {
    name: 'Describe · "smart casual for a dinner meeting"',
    body: { mode: 'describe', environment: 'indoor-ac', planned_for: 'tonight', custom_context: 'smart casual for a dinner meeting' },
    rules: { minFormality: 3 },
  },
  {
    name: 'Describe · "gym workout session"',
    body: { mode: 'describe', environment: 'outdoor', planned_for: 'now', custom_context: 'gym workout session' },
    rules: { maxFormality: 2 },
  },
  {
    name: 'Trip · Mumbai',
    body: { mode: 'travel', environment: 'outdoor', planned_for: 'tomorrow', trip_city: 'Mumbai' },
    expectCity: 'Mumbai',
  },
  {
    name: 'Heat extreme · 46°C override',
    body: { mode: 'quick', environment: 'outdoor', planned_for: 'now', override_temp_c: 46 },
  },
  {
    // BUG-005 (2026-07-07): a failed destination lookup must NOT block
    // generation — server falls back to local weather and flags it.
    name: 'Trip · unresolvable city (falls back to local weather)',
    body: { mode: 'travel', environment: 'outdoor', planned_for: 'now', trip_city: 'Xyzzyville123' },
    expectDestinationAdvisory: true,
  },
  {
    name: 'Invalid body (bad enum)',
    body: { mode: 'quick', environment: 'underwater' },
    expectStatus: 400,
  },
];

let pass = 0, fail = 0;
const failures = [];

for (const t of TESTS) {
  const started = Date.now();
  let res, json;
  try {
    res = await fetch(`${BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(t.body),
    });
    json = await res.json();
  } catch (e) {
    fail++; failures.push(`${t.name}: request failed — ${e.message}`);
    console.log(`✗ ${t.name} — request failed: ${e.message}`);
    continue;
  }
  const ms = Date.now() - started;
  const problems = [];

  if (t.expectStatus) {
    if (res.status !== t.expectStatus) problems.push(`expected HTTP ${t.expectStatus}, got ${res.status}`);
  } else if (res.status !== 200) {
    problems.push(`HTTP ${res.status}: ${json.error ?? ''} ${json.details ?? ''}`);
  } else {
    const outfits = json.outfits ?? [];
    if (outfits.length === 0) problems.push('zero outfits returned');
    if (t.expectCity && !json.context?.city?.includes(t.expectCity)) {
      problems.push(`expected city ${t.expectCity}, got ${json.context?.city}`);
    }
    if (t.expectDestinationAdvisory && !json.destination_advisory) {
      problems.push('expected destination_advisory in response');
    }

    outfits.forEach((o, idx) => {
      const resolved = o.items.map((id) => items.get(id)).filter(Boolean);
      if (resolved.length !== o.items.length) problems.push(`outfit ${idx + 1}: ${o.items.length - resolved.length} unknown item id(s)`);

      const hasTop = resolved.some((i) => CLOTHING_TOP.has(i.category?.layer_type));
      const hasBottom = resolved.some((i) => i.category?.layer_type === 'bottom');
      const hasFootwear = resolved.some((i) => i.category?.layer_type === 'footwear');
      if (!hasTop && !o.partial_outfit && !o.incomplete) problems.push(`outfit ${idx + 1}: no top`);
      if (!hasBottom && !o.partial_outfit && !o.incomplete) problems.push(`outfit ${idx + 1}: no bottom`);
      if (!hasFootwear) problems.push(`outfit ${idx + 1}: no footwear (soft)`);

      // Layer duplicate check
      const layerCounts = {};
      for (const i of resolved) {
        const l = i.category?.layer_type;
        if (['base', 'mid', 'outer', 'bottom'].includes(l)) layerCounts[l] = (layerCounts[l] ?? 0) + 1;
      }
      for (const [l, c] of Object.entries(layerCounts)) {
        if (c > 1) problems.push(`outfit ${idx + 1}: ${c}× ${l} layer`);
      }

      // Formality gates (skip null-formality items, matching the Bouncer)
      if (t.rules?.minFormality != null) {
        for (const i of resolved) {
          if (i.formality != null && i.formality < t.rules.minFormality) {
            problems.push(`outfit ${idx + 1}: "${i.name}" formality ${i.formality} < min ${t.rules.minFormality}`);
          }
        }
      }
      if (t.rules?.maxFormality != null) {
        for (const i of resolved) {
          if (i.formality != null && i.formality > t.rules.maxFormality) {
            problems.push(`outfit ${idx + 1}: "${i.name}" formality ${i.formality} > max ${t.rules.maxFormality}`);
          }
        }
      }

      // Excluded vibes
      if (t.rules?.excludedVibes) {
        for (const i of resolved) {
          const bad = (i.vibe ?? []).filter((v) => t.rules.excludedVibes.includes(v));
          if (bad.length) problems.push(`outfit ${idx + 1}: "${i.name}" has excluded vibe(s): ${bad.join(', ')}`);
        }
      }

      // Excluded layers
      if (t.rules?.excludedLayers) {
        for (const i of resolved) {
          if (t.rules.excludedLayers.includes(i.category?.layer_type)) {
            problems.push(`outfit ${idx + 1}: "${i.name}" is excluded layer ${i.category?.layer_type}`);
          }
        }
      }

      // Hallucination note surfaced to user
      if (/referenced by AI were not in your wardrobe/.test(o.reasoning)) {
        problems.push(`outfit ${idx + 1}: hallucinated items detected (cleaned, but LLM hallucinated)`);
      }
    });

    if (t.name.startsWith('Heat extreme') && !json.heat_advisory && outfits.length > 0) {
      // advisory only fires when candidates < 3 — informational
    }
  }

  if (problems.length === 0) {
    pass++;
    const extra = json.heat_advisory ? ' [heat advisory shown]' : '';
    console.log(`✓ ${t.name} (${ms}ms, ${json.outfits?.length ?? '-'} outfits, ${json.candidate_count ?? '-'} candidates)${extra}`);
  } else {
    fail++;
    failures.push(`${t.name}:\n   - ${problems.join('\n   - ')}`);
    console.log(`✗ ${t.name} (${ms}ms)`);
    for (const p of problems) console.log(`   - ${p}`);
  }
}

console.log(`\n${pass}/${pass + fail} tests passed`);
if (failures.length) process.exit(1);
