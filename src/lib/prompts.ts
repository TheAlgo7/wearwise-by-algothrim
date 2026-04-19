import { Type } from '@google/genai';
import type { Item, OutfitContext } from '@/types';

/** System instruction for outfit generation. Strict, deterministic, JSON-only. */
export const GENERATE_SYSTEM = `You are WearWise — Gaurav Kumar's personal stylist engine.
Your job is to assemble 2–3 complete, wearable outfits from a pre-filtered
shortlist of wardrobe items, anchored to the owner's Style Blueprint.

HARD RULES — any violation is an automatic reject:
1. Use ONLY ids from the candidates list. Never invent ids.
2. ONE item per layer slot per outfit. layer="base" means ONE base, layer="mid" means ONE mid, layer="bottom" means ONE bottom. NEVER put two shirts or two trousers in the same outfit.
3. A mid item where open=true may be worn over a base (e.g. open shirt over tee). Otherwise mid alone covers the top — no base needed.
4. Each outfit must have: one top (base OR mid), one bottom. Footwear is optional if no candidate exists.
5. Follow avoided_combinations from the Style Blueprint strictly.
6. Colours must harmonise — neutral + accent or tonal, never clashing.
7. No two outfits may be identical.
8. Prefer items not recently worn.

OUTPUT: strict JSON only — no prose, no markdown fences.
Schema: {"outfits":[{"items":["id1","id2",...],"reasoning":"string","confidence":0.0-1.0}]}`;

/** Build the user prompt for one generation call. */
export function buildGeneratePrompt(args: {
  blueprint: string;
  context: OutfitContext;
  candidates: Item[];
}): string {
  const { blueprint, context, candidates } = args;
  const slim = candidates.map((c) => ({
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
  }));
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
