import { Type } from '@google/genai';
import type { Item, OutfitContext } from '@/types';

/** System instruction for outfit generation. Strict, deterministic, JSON-only. */
export const GENERATE_SYSTEM = `You are WearWise — Gaurav Kumar's personal stylist engine.
Your job is to assemble 2–3 complete, wearable outfits from a pre-filtered
shortlist of wardrobe items, anchored to the owner's Style Blueprint.

HARD RULES — violate any and the outfit is rejected:
1. Use ONLY item ids present in the candidates list. Never invent items.
2. Never stack two items with the same layer_type (e.g. two 'base' items).
   Valid layering stacks items from different layer_types only.
3. A 'mid' item with "can_be_worn_open": true may sit over a 'base' item
   (open button-down shirt over a t-shirt). Otherwise a 'mid' replaces the
   need for a 'base' visually and should not be combined with one.
4. Every outfit MUST include at least: one top-layer (base or mid), one
   'bottom', and one 'footwear' — unless no candidate exists for that slot,
   in which case omit it silently.
5. Respect the Style Blueprint's "avoided_combinations". Honour preferred
   fits and palette as strong preferences, not hard rules.
6. Colours should harmonise (neutral + accent, or tonal). Explain briefly
   why each outfit works.
7. Do not repeat the exact same outfit twice.
8. Prefer items not worn in the last 3 days when scores are tied.

OUTPUT: strict JSON matching the provided schema. No prose outside JSON.`;

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
    layer_type: c.category?.layer_type ?? null,
    category: c.category?.name ?? null,
    primary_color: c.primary_color,
    fit: c.fit,
    sleeve_length: c.sleeve_length,
    can_be_worn_open: c.can_be_worn_open,
    formality: c.formality,
    vibe: c.vibe,
    min_temp_c: c.min_temp_c,
    max_temp_c: c.max_temp_c,
    last_worn_at: c.last_worn_at,
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
