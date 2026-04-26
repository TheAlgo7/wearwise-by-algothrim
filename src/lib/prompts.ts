import { Type } from '@google/genai';
import type { Item, OutfitContext } from '@/types';

/** System instruction for outfit generation. Strict, deterministic, JSON-only. */
export const GENERATE_SYSTEM = `You are WearWise — Gaurav Kumar's personal stylist engine.
Your job is to assemble 2–3 complete, wearable outfits from a pre-filtered
shortlist of wardrobe items, anchored to the owner's Style Blueprint.

HARD RULES — any violation is an automatic reject:
1. Use ONLY ids from the candidates list. Never invent ids.
2. ONE item per layer slot for clothing: one base, one mid, one outer, one bottom per outfit. NEVER two shirts or two trousers.
3. A mid item where open=true may be worn over a base (e.g. open shirt over tee). Otherwise mid alone covers the top.
4. Each outfit MUST have: one top (base OR mid) AND one bottom AND footwear (if candidates exist). A complete outfit targets 5–7 items total — never stop at 4.
5. WATCH: ALWAYS include a watch when one exists in the candidates — every outfit gets a watch. Pick the one whose formality is closest to the outfit's overall formality.
   BELT: Include a belt whenever the outfit has trousers/jeans AND a belt candidate exists with matching formality. Bootcuts always pair with a belt.
   Sunglasses: include for outdoor daytime modes (casual, travel, quick).
   Other accessories (cap): include when they genuinely improve the look.
6. STATEMENT accessories (bandana, cowboy hat, fedora, arm sleeves) — only include when mode/context explicitly calls for it. Do NOT add them to everyday outfits.
7. TIES: ONLY with collared dress shirts (Shirt/Button-down category). NEVER with polo, t-shirt, hoodie, sweatshirt, or any knitwear. A tie on a polo = automatic reject.
7. Follow avoided_combinations from the Style Blueprint strictly.
8. Colours must harmonise — neutral + accent or tonal, never clashing.
9. No two outfits may be identical.
10. Prefer items not recently worn.

MODE GUIDANCE:
- home: Lounge/comfort ONLY. Slippers or slides are the ONLY accepted footwear — never sneakers or shoes at home. NO watches, NO belts. Keep it max 3 items: top + bottom + slippers.
- casual: Friends, mall, local streets, car rides. Relaxed but put-together.
- smart: Dinner, meeting, date, family event. Smart-casual to polished. Bootcuts + nice shirt or structured look preferred.
- gym: Athletic outfits only. Performance tees, shorts, trainers. Arm sleeves allowed.
- church: Modest, clean, structured. No gym or lounge vibes.
- travel: Comfortable, layerable, repeated-wear friendly.
- impress: FULL signature outfits — top + bottom + footwear + accessories. Pick the most stylish, head-turning combos from ALL available candidates. This is the "best dressed" mode — full complete outfits only, never just accessories alone.
- night: Dark palette. Evening/party energy.
- describe: Use the custom_context field to understand the exact occasion and dress accordingly. For parties, pick festive/smart-casual combos.
- quick: Pick the easiest put-together outfit for right now.

VARIETY RULE: Each generation must explore different combinations. Do NOT repeat the same outfit you might have suggested before. Rotate through the full candidate pool — use items across the entire shortlist, not just the first few.

If planned_for is "tomorrow" — note this is advance planning. If "tonight" — skew evening/night energy.

OUTPUT: strict JSON only — no prose, no markdown fences.
Schema: {"outfits":[{"items":["id1","id2",...],"reasoning":"string","confidence":0.0-1.0}]}

REASONING FIELD — this is the most important field. Write 2–3 punchy sentences that cover ALL of these:
1. Why this specific combo suits the occasion/mode and Gaurav's personal style
2. Color story — how the pieces harmonise (e.g. "the navy tones down the white so it reads clean, not stark")
3. Body/fit note — how the silhouette works for the owner (e.g. "bootcut balances the shoulder line", "oversized top over slim bottom creates contrast")
4. One actionable styling tip (e.g. "tuck just the front", "fold the sleeves once", "let the open shirt hang loose over the tee")
Reference actual item names and colors. Be specific — NOT generic filler like "this is comfortable" or "this looks good".`;

/** Build the user prompt for one generation call. */
export function buildGeneratePrompt(args: {
  blueprint: string;
  context: OutfitContext;
  candidates: Item[];
}): string {
  const { blueprint, context, candidates } = args;
  const slim = candidates.map((c) => {
    const isAccessory = ['accessory','headwear','eyewear','timepiece','jewelry'].includes(c.category?.layer_type ?? '');
    return {
      id: c.id,
      name: c.name,
      layer: c.category?.layer_type ?? null,
      cat: c.category?.name ?? null,
      color: c.primary_color,
      fit: c.fit,
      sleeve: c.sleeve_length,
      open: c.can_be_worn_open ?? false,
      formality: c.formality,
      vibe: c.vibe,
      ...(isAccessory && c.occasions?.length ? { occasions: c.occasions } : {}),
      ...(isAccessory && c.notes ? { note: c.notes } : {}),
    };
  });
  return [
    `STYLE BLUEPRINT:\n${blueprint}`,
    `CONTEXT:\n${JSON.stringify(context, null, 2)}`,
    `CANDIDATES (${slim.length} items):\n${JSON.stringify(slim, null, 2)}`,
    `Return 2–3 outfits. Use only these ids.`,
  ].join('\n\n');
}

/** JSON schema for generation response — uses SDK Type enum (required by @google/genai v1.x). */
export const GENERATE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    outfits: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          items:      { type: Type.ARRAY, items: { type: Type.STRING } },
          reasoning:  { type: Type.STRING },
          confidence: { type: Type.NUMBER },
        },
        required: ['items', 'reasoning', 'confidence'],
      },
    },
  },
  required: ['outfits'],
};

// ---------------------------------------------------------------------
// Tagging prompt — Gemini Vision returns structured JSON for one photo
// ---------------------------------------------------------------------

export const TAG_SYSTEM = `You are WearWise's wardrobe analyst. Given a
single clothing-item photo, return structured metadata so the owner can
confirm it with one tap instead of typing. Be specific — prefer concrete
values over "unknown". If you cannot tell a field, set it to null.`;

export const TAG_PROMPT = `Analyse this clothing item photo and return JSON with:
  - name: short descriptive name, e.g. "White Oversized Linen Shirt"
  - category_hint: one of {T-shirt, Polo, Shirt (Button-down), Sweatshirt, Sweater / Knit, Overshirt, Jacket, Blazer, Coat, Hoodie, Trousers, Jeans, Cargos, Shorts, Joggers, Sneakers, Formal Shoes, Boots, Sandals / Slides, Watch, Glasses, Sunglasses, Cap / Hat, Belt, Bag, Chain / Necklace, Ring, Bracelet, Tank / Vest}
  - primary_color: best hex or colour name (e.g. "cream", "#F5E6D0")
  - secondary_colors: array of hex/names
  - fit: one of {oversized, relaxed, regular, slim, fitted, bootcut, straight, wide, tapered} or null
  - sleeve_length: one of {sleeveless, short, three-quarter, long, rolled, none} or null
  - can_be_worn_open: boolean (true for button-down shirts that look wearable unbuttoned)
  - material: array of materials you can identify (e.g. ["linen","cotton"])
  - formality: integer 1-5 (1 gym/lounge, 3 smart-casual, 5 black-tie)
  - vibe: array from {casual, street, smart-casual, clean, formal, church, party, gym, lounge, travel, beach, ethnic}
  - min_temp_c: lowest outdoor temperature (°C) this is comfortable in
  - max_temp_c: highest outdoor temperature (°C) this is comfortable in
  - occasions: array from {daily, church, work, party, date, trip, gym, home, wedding, funeral, festival}
  - notes: one sentence about the piece's defining feature`;

export const TAG_SCHEMA = {
  type: 'object',
  properties: {
    name:             { type: 'string' },
    category_hint:    { type: 'string' },
    primary_color:    { type: 'string' },
    secondary_colors: { type: 'array', items: { type: 'string' } },
    fit:              { type: 'string', nullable: true },
    sleeve_length:    { type: 'string', nullable: true },
    can_be_worn_open: { type: 'boolean' },
    material:         { type: 'array', items: { type: 'string' } },
    formality:        { type: 'integer' },
    vibe:             { type: 'array', items: { type: 'string' } },
    min_temp_c:       { type: 'number', nullable: true },
    max_temp_c:       { type: 'number', nullable: true },
    occasions:        { type: 'array', items: { type: 'string' } },
    notes:            { type: 'string' },
  },
  required: ['name', 'category_hint', 'primary_color', 'formality', 'vibe'],
} as const;

// ---------------------------------------------------------------------
// Image clean prompt — used with gemini-2.5-flash-image for bg removal
// ---------------------------------------------------------------------

export const CLEAN_IMAGE_PROMPT = `Remove the background of this clothing-item photo completely, leaving only the garment/item on a fully transparent background. Do not alter the colours, textures, or shape of the item. Keep the item centered, upright, and in its original proportions. Output only the edited image.`;
