import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { generateJSON } from '@/lib/llm';
import { effectiveTempC, getWeatherByCity, getWeatherByCoords, timeOfDay } from '@/lib/weather';
import { DEFAULT_MODES, extractDescribeFormality } from '@/lib/modes';
import { filterItems, rankCandidates } from '@/lib/filter-engine';
import { formatBlueprint, getStyleProfile } from '@/lib/style-profile';
import { GENERATE_SYSTEM, buildGeneratePrompt } from '@/lib/prompts';
import { SEASONS, resolveSeason } from '@/lib/season';
import type { Item, Mode } from '@/types';

export const runtime = 'nodejs';
// Worst case walks the whole provider chain (each rung capped at 12s in llm.ts).
export const maxDuration = 60;

const Body = z.object({
  mode: z.string().default('quick'),
  environment: z.enum(['outdoor', 'indoor-ac']).default('outdoor'),
  event: z.string().optional(),
  trip_city: z.string().optional(),
  override_temp_c: z.number().optional(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  custom_context: z.string().optional(),
  planned_for: z.enum(['now', 'tonight', 'tomorrow']).default('now'),
  // Client-resolved season. Sent on every generate so a manual override
  // ("I am in Manali this week") reaches the engine, not just the UI.
  season: z.enum(SEASONS).optional(),
});

// Shape of what the LLM must return — anything else is a provider bug, not a 500.
const LLMOutput = z.object({
  outfits: z.array(
    z.object({
      items: z.array(z.string()),
      reasoning: z.string().catch(''),
      confidence: z.number().catch(0.7),
    })
  ).min(1),
});

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: 'Invalid body', details: String(e) }, { status: 400 });
  }

  const supa = createAdminClient();

  // 1. Weather, mode rules, wardrobe, and style profile are independent —
  // fetch them in parallel so generation latency is bounded by the slowest one.
  // BUG-005: a failed destination lookup must never block generation — fall back
  // to local weather (coords or default city) and surface an advisory instead.
  const localWeather = () =>
    parsed.lat && parsed.lon
      ? getWeatherByCoords(parsed.lat, parsed.lon)
      : getWeatherByCity(process.env.NEXT_PUBLIC_DEFAULT_CITY ?? 'New Delhi,IN');

  const weatherPromise = (async () => {
    if (parsed.trip_city) {
      try {
        return { weather: await getWeatherByCity(parsed.trip_city), destinationFailed: false };
      } catch {
        return { weather: await localWeather(), destinationFailed: true };
      }
    }
    return { weather: await localWeather(), destinationFailed: false };
  })();

  const [weatherResult, { data: modeRow }, { data: itemRows, error: itemsErr }, profile] =
    await Promise.all([
      weatherPromise.then((w) => ({ ok: true as const, ...w })).catch((err: unknown) => ({ ok: false as const, err })),
      supa.from('modes').select('*').eq('id', parsed.mode).maybeSingle(),
      supa.from('items').select('*, category:categories(*)').eq('archived', false),
      getStyleProfile(),
    ]);

  if (!weatherResult.ok) {
    const err = weatherResult.err;
    return NextResponse.json(
      { error: 'Weather fetch failed', details: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }
  const { weather, destinationFailed } = weatherResult;

  const rawTemp = parsed.override_temp_c ?? weather.temp_c;
  const temp_c = effectiveTempC(rawTemp, parsed.environment);
  const tod = weather.is_night ? 'night' : timeOfDay();

  // 2. Mode rules
  // Merge DB rules on top of DEFAULT_MODES so new rule fields (excluded_layers, etc.)
  // defined in defaults are always present even when the DB row predates them.
  const defaultMode = DEFAULT_MODES.find((m) => m.id === parsed.mode) ?? DEFAULT_MODES[0];
  const baseRules = modeRow
    ? { ...defaultMode.rules, ...(modeRow as Mode).rules }
    : defaultMode.rules;
  // For Describe mode, parse the user's prompt for formality signals and inject
  // them into the Bouncer rules so casual tees are blocked for "dinner meetings".
  const describeOverride =
    parsed.mode === 'describe' && parsed.custom_context
      ? extractDescribeFormality(parsed.custom_context)
      : {};
  const mode: Mode = modeRow
    ? { ...(modeRow as Mode), rules: { ...baseRules, ...describeOverride } }
    : { ...defaultMode, rules: { ...baseRules, ...describeOverride } };

  // 3. Candidates
  if (itemsErr) {
    return NextResponse.json({ error: itemsErr.message }, { status: 500 });
  }
  const all = (itemRows ?? []) as Item[];

  // A manual season override is a statement of intent that beats the local
  // thermometer: he sets Winter because of where he is going, not where he is.
  // When the client sends nothing, derive it the same way the UI does —
  // calendar first, temperature only when it contradicts. Calling seasonForTemp
  // directly here bypassed that and reported Summer in the middle of monsoon.
  const season =
    parsed.season ??
    resolveSeason(null, { temp_c: rawTemp, humidity: weather.humidity }).season;

  const shortlist = filterItems(all, {
    temp_c,
    time_of_day: tod,
    environment: parsed.environment,
    event: parsed.event,
    mode_rules: mode.rules,
    season,
  });
  const ranked = rankCandidates(shortlist, mode.rules, temp_c);

  // Layer-aware candidate selection — guarantee tops + bottoms always reach the LLM
  // so accessories don't crowd them out of a blind top-N slice.
  const byLayer = (layers: string[], cap: number) =>
    ranked.filter((i) => layers.includes(i.category?.layer_type ?? '')).slice(0, cap);

  const candidates = [
    ...byLayer(['base', 'mid', 'outer'], 7),
    ...byLayer(['bottom'], 5),
    ...byLayer(['footwear'], 4),
    ...byLayer(['timepiece'], 3),                           // watches always guaranteed a slot
    ...byLayer(['accessory', 'headwear', 'eyewear', 'jewelry'], 7),
  ].filter((item, idx, arr) => arr.findIndex((x) => x.id === item.id) === idx); // dedup

  // BUG-008 fallback: if temp gate wiped out the wardrobe, surface best-available items
  // with a heat advisory rather than returning an error.
  let heatAdvisory = false;
  let finalCandidates = candidates;
  if (candidates.length < 3) {
    // Relax: skip all weather/formality gates — rank everything and pick the best
    const fallbackRanked = rankCandidates(all.filter((i) => !i.archived), mode.rules, temp_c);
    const fallbackByLayer = (layers: string[], cap: number) =>
      fallbackRanked.filter((i) => layers.includes(i.category?.layer_type ?? '')).slice(0, cap);
    finalCandidates = [
      ...fallbackByLayer(['base', 'mid', 'outer'], 7),
      ...fallbackByLayer(['bottom'], 5),
      ...fallbackByLayer(['footwear'], 4),
      ...fallbackByLayer(['timepiece'], 3),
      ...fallbackByLayer(['accessory', 'headwear', 'eyewear', 'jewelry'], 7),
    ].filter((item, idx, arr) => arr.findIndex((x) => x.id === item.id) === idx);
    heatAdvisory = true;
  }

  if (finalCandidates.length < 3) {
    return NextResponse.json(
      {
        error: 'Not enough wardrobe items to build outfits. Add more items.',
        candidate_count: finalCandidates.length,
        context: { temp_c, condition: weather.condition, time_of_day: tod, environment: parsed.environment, mode: parsed.mode, city: weather.city },
      },
      { status: 422 }
    );
  }

  // 4. Style Blueprint (fetched in parallel above)
  const blueprint = formatBlueprint(profile);

  const context = {
    temp_c,
    condition: weather.condition,
    season,
    time_of_day: parsed.planned_for === 'tonight' ? 'evening' : parsed.planned_for === 'tomorrow' ? 'morning' : tod,
    environment: parsed.environment,
    event: parsed.event,
    mode: parsed.mode,
    custom_context: parsed.custom_context,
    planned_for: parsed.planned_for,
    city: weather.city,
    // A destination that failed to resolve is no longer a trip context
    trip_location: destinationFailed ? undefined : parsed.trip_city,
    // Random seed so the LLM explores different combinations every generation
    variation_seed: Math.random().toString(36).slice(2, 8),
  };

  // 5. Generate outfits via multi-provider LLM (Groq → OpenRouter → Gemini)
  const prompt = buildGeneratePrompt({ blueprint, context, candidates: finalCandidates });

  let rawOutfits;
  try {
    const text = await generateJSON(GENERATE_SYSTEM, prompt);
    const parsedJson: unknown = JSON.parse(text);
    // Some models return the outfits array bare instead of { outfits: [...] }.
    const validated = LLMOutput.safeParse(
      Array.isArray(parsedJson) ? { outfits: parsedJson } : parsedJson
    );
    if (!validated.success) {
      throw new Error(`Model returned malformed outfit JSON: ${validated.error.issues[0]?.message ?? 'unknown shape'}`);
    }
    rawOutfits = validated.data.outfits;
  } catch (err) {
    const details = err instanceof Error ? err.message : String(err);
    console.error('[generate] LLM error:', details);
    return NextResponse.json({ error: 'AI generation failed', details }, { status: 502 });
  }

  // 6. Validate + deduplicate by layer_type (AI sometimes stacks 2 shirts or 2 trousers)
  const validIds = new Set(finalCandidates.map((i) => i.id));
  const itemById = new Map(finalCandidates.map((i) => [i.id, i]));

  const cleaned = rawOutfits
    .map((o) => {
      // Remove ids the AI hallucinated and deduplicate
      const hallucinated = o.items.filter((id) => !validIds.has(id));
      const valid = [...new Set(o.items)].filter((id) => validIds.has(id));
      // You wear one pair of shoes, one watch, one hat, one pair of glasses.
      // Only base/mid/outer/bottom were deduped before, so the model could
      // return two pairs of trainers or two watches and both survived.
      const SINGLE_PER_LAYER = new Set([
        'base', 'mid', 'outer', 'bottom', 'footwear', 'timepiece', 'headwear', 'eyewear',
      ]);
      // Accessories and jewellery are deduped one level finer, by category:
      // a belt with a tie is fine, two belts is not.
      const seenLayers = new Set<string>();
      const seenCategories = new Set<string>();
      const deduped = valid.filter((id) => {
        const item = itemById.get(id);
        const layer = item?.category?.layer_type ?? id;
        if (SINGLE_PER_LAYER.has(layer)) {
          if (seenLayers.has(layer)) return false;
          seenLayers.add(layer);
          return true;
        }
        const category = item?.category?.name ?? id;
        if (seenCategories.has(category)) return false;
        seenCategories.add(category);
        return true;
      });

      // Hard rule: remove ties if no dress shirt (button-down) in outfit
      const hasDressShirt = deduped.some((id) => {
        const cat = itemById.get(id)?.category?.name ?? '';
        return cat.toLowerCase().includes('shirt');
      });
      let final = hasDressShirt
        ? deduped
        : deduped.filter((id) => itemById.get(id)?.category?.name !== 'Tie');

      // Rule-4 guarantee: the model sometimes forgets footwear. If footwear
      // candidates passed the gates, append one server-side.
      const hasFootwear = final.some((id) => itemById.get(id)?.category?.layer_type === 'footwear');
      if (!hasFootwear) {
        // Match the shoe to the outfit rather than taking whatever sat first in
        // the candidate list. Ranking is near-random by design, so "first" was
        // handing out gym trainers with button-down shirts.
        const worn = final.map((id) => itemById.get(id)).filter((i): i is Item => Boolean(i));
        const formalities = worn.map((i) => i.formality).filter((f): f is number => f != null);
        const target = formalities.length
          ? formalities.reduce((a, b) => a + b, 0) / formalities.length
          : 3;
        const vibes = new Set(worn.flatMap((i) => i.vibe));

        const fw = finalCandidates
          .filter((i) => i.category?.layer_type === 'footwear')
          .map((shoe) => {
            const gap = Math.abs((shoe.formality ?? 3) - target);
            const shares = shoe.vibe.some((v) => vibes.has(v)) ? 1 : 0;
            return { shoe, cost: gap - shares };
          })
          .sort((a, b) => a.cost - b.cost)[0]?.shoe;

        if (fw) final = [...final, fw.id];
      }

      // Hallucinated ids are cleaned silently — stylist notes stay on-brand.
      // The count still lands in Vercel logs for debugging.
      if (hallucinated.length > 0) {
        console.warn(`[generate] LLM hallucinated ${hallucinated.length} item id(s):`, hallucinated);
      }

      return { ...o, items: final, reasoning: o.reasoning };
    })
    .map((o) => {
      const hasTop = o.items.some((id) => {
        const layer = itemById.get(id)?.category?.layer_type ?? '';
        return layer === 'base' || layer === 'mid' || layer === 'outer';
      });
      const hasBottom = o.items.some((id) => itemById.get(id)?.category?.layer_type === 'bottom');
      return { ...o, _hasTop: hasTop, _hasBottom: hasBottom };
    });

  // 3-tier fallback — never return a blank screen
  const tier1 = cleaned.filter((o) => o._hasTop && o._hasBottom);
  let finalOutfits: typeof cleaned;

  if (tier1.length > 0) {
    finalOutfits = tier1;
  } else {
    const tier2 = cleaned.filter((o) => o._hasTop || o._hasBottom);
    if (tier2.length > 0) {
      console.warn('[generate] Tier-2 fallback: no outfit has both top+bottom — returning partial outfits');
      finalOutfits = tier2.map((o) => ({ ...o, partial_outfit: true }));
    } else {
      console.warn('[generate] Tier-3 fallback: no outfit has any clothing — returning raw AI output');
      finalOutfits = cleaned.map((o) => ({ ...o, incomplete: true }));
    }
  }

  // Strip internal classification flags before sending
  const strippedOutfits = finalOutfits.map(({ _hasTop: _t, _hasBottom: _b, ...o }) => o);

  return NextResponse.json({
    outfits: strippedOutfits,
    context,
    candidate_count: finalCandidates.length,
    ...(heatAdvisory && { heat_advisory: `It's ${temp_c}°C — your tagged wardrobe is optimised for cooler temps, so these are the most heat-appropriate pieces available.` }),
    ...(destinationFailed && { destination_advisory: `Couldn't get weather for "${parsed.trip_city}" — generated for ${weather.city} conditions instead.` }),
  });
}
