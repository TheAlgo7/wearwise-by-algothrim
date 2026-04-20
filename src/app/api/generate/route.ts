import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { generateJSON } from '@/lib/llm';
import { effectiveTempC, getWeatherByCity, getWeatherByCoords, timeOfDay } from '@/lib/weather';
import { DEFAULT_MODES } from '@/lib/modes';
import { filterItems, rankCandidates } from '@/lib/filter-engine';
import { formatBlueprint, getStyleProfile } from '@/lib/style-profile';
import { GENERATE_SYSTEM, buildGeneratePrompt } from '@/lib/prompts';
import type { Item, Mode } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 30;

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
});

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: 'Invalid body', details: String(e) }, { status: 400 });
  }

  const supa = createAdminClient();

  // 1. Weather — trip city overrides current location
  let weather;
  try {
    if (parsed.trip_city) {
      weather = await getWeatherByCity(parsed.trip_city);
    } else if (parsed.lat && parsed.lon) {
      weather = await getWeatherByCoords(parsed.lat, parsed.lon);
    } else {
      weather = await getWeatherByCity(process.env.NEXT_PUBLIC_DEFAULT_CITY ?? 'New Delhi,IN');
    }
  } catch (err) {
    return NextResponse.json(
      { error: 'Weather fetch failed', details: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }

  const rawTemp = parsed.override_temp_c ?? weather.temp_c;
  const temp_c = effectiveTempC(rawTemp, parsed.environment);
  const tod = weather.is_night ? 'night' : timeOfDay();

  // 2. Mode rules
  const { data: modeRow } = await supa
    .from('modes')
    .select('*')
    .eq('id', parsed.mode)
    .maybeSingle();
  const mode: Mode = (modeRow as Mode) ??
    DEFAULT_MODES.find((m) => m.id === parsed.mode) ??
    DEFAULT_MODES[0];

  // 3. Candidates — fetch items with categories joined
  const { data: itemRows, error: itemsErr } = await supa
    .from('items')
    .select('*, category:categories(*)')
    .eq('archived', false);
  if (itemsErr) {
    return NextResponse.json({ error: itemsErr.message }, { status: 500 });
  }
  const all = (itemRows ?? []) as Item[];

  const shortlist = filterItems(all, {
    temp_c,
    time_of_day: tod,
    environment: parsed.environment,
    event: parsed.event,
    mode_rules: mode.rules,
  });
  const ranked = rankCandidates(shortlist, mode.rules).slice(0, 20);

  if (ranked.length < 3) {
    return NextResponse.json(
      {
        error: 'Not enough candidates to build outfits. Add more items or relax the mode.',
        candidate_count: ranked.length,
        context: { temp_c, condition: weather.condition, time_of_day: tod, environment: parsed.environment, mode: parsed.mode, city: weather.city },
      },
      { status: 422 }
    );
  }

  // 4. Style Blueprint
  const profile = await getStyleProfile();
  const blueprint = formatBlueprint(profile);

  const context = {
    temp_c,
    condition: weather.condition,
    time_of_day: parsed.planned_for === 'tonight' ? 'evening' : parsed.planned_for === 'tomorrow' ? 'morning' : tod,
    environment: parsed.environment,
    event: parsed.event,
    mode: parsed.mode,
    custom_context: parsed.custom_context,
    planned_for: parsed.planned_for,
    city: weather.city,
    trip_location: parsed.trip_city,
  };

  // 5. Generate outfits via multi-provider LLM (Groq → OpenRouter → Gemini)
  const prompt = buildGeneratePrompt({ blueprint, context, candidates: ranked });

  let outfits;
  try {
    const text = await generateJSON(GENERATE_SYSTEM, prompt);
    const parsedOut = JSON.parse(text);
    outfits = parsedOut.outfits;
  } catch (err) {
    const details = err instanceof Error ? err.message : String(err);
    console.error('[generate] LLM error:', details);
    return NextResponse.json({ error: 'AI generation failed', details }, { status: 502 });
  }

  // 6. Validate + deduplicate by layer_type (AI sometimes stacks 2 shirts or 2 trousers)
  const validIds = new Set(ranked.map((i) => i.id));
  const itemById = new Map(ranked.map((i) => [i.id, i]));

  const cleaned = (outfits as { items: string[]; reasoning: string; confidence: number }[])
    .map((o) => {
      // Remove ids the AI hallucinated and deduplicate
      const valid = [...new Set(o.items)].filter((id) => validIds.has(id));
      // Deduplicate clothing layers (base/mid/outer/bottom) but allow multiple accessories
      const DUPE_LAYERS = new Set(['base', 'mid', 'outer', 'bottom']);
      const seenLayers = new Set<string>();
      const deduped = valid.filter((id) => {
        const layer = itemById.get(id)?.category?.layer_type ?? id;
        if (!DUPE_LAYERS.has(layer)) return true; // accessories always allowed
        if (seenLayers.has(layer)) return false;
        seenLayers.add(layer);
        return true;
      });
      return { ...o, items: deduped };
    })
    .filter((o) => o.items.length >= 2);

  return NextResponse.json({
    outfits: cleaned,
    context,
    candidate_count: ranked.length,
  });
}
