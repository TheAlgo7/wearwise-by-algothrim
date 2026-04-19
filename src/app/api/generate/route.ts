import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { gemini, MODELS } from '@/lib/gemini';
import { effectiveTempC, getWeatherByCity, getWeatherByCoords, timeOfDay } from '@/lib/weather';
import { DEFAULT_MODES } from '@/lib/modes';
import { filterItems, rankCandidates } from '@/lib/filter-engine';
import { formatBlueprint, getStyleProfile } from '@/lib/style-profile';
import {
  GENERATE_SCHEMA,
  GENERATE_SYSTEM,
  buildGeneratePrompt,
} from '@/lib/prompts';
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
    time_of_day: tod,
    environment: parsed.environment,
    event: parsed.event,
    mode: parsed.mode,
    city: weather.city,
    trip_location: parsed.trip_city,
  };

  // 5. Ask Gemini
  const prompt = buildGeneratePrompt({ blueprint, context, candidates: ranked });

  let outfits;
  try {
    const result = await gemini().models.generateContent({
      model: MODELS.reasoning,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: GENERATE_SYSTEM,
        responseMimeType: 'application/json',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        responseSchema: GENERATE_SCHEMA as any,
        temperature: 0.9,
      },
    });
    const text = result.text ?? '';
    const parsedOut = JSON.parse(text);
    outfits = parsedOut.outfits;
  } catch (err) {
    const details = err instanceof Error ? err.message : String(err);
    console.error('[generate] Gemini error:', details);
    return NextResponse.json({ error: 'AI generation failed', details }, { status: 502 });
  }

  // 6. Persist as outfits rows (is_saved = false until user saves)
  const validIds = new Set(ranked.map((i) => i.id));
  const cleaned = (outfits as { items: string[]; reasoning: string; confidence: number }[])
    .map((o) => ({ ...o, items: o.items.filter((id) => validIds.has(id)) }))
    .filter((o) => o.items.length >= 2);

  return NextResponse.json({
    outfits: cleaned,
    context,
    candidate_count: ranked.length,
  });
}
