# WearWise Implementation Plan

> **App:** WearWise — Custom made for The Algothrim | Gaurav Kumar
> **Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · Supabase · Gemini API · OpenWeather · PWA
> **Aesthetic:** Samsung One UI 7 · True black AMOLED (#000) · Crimson Nitro accent (#DC143C → #FF1744)
> **Device target:** Samsung Galaxy S24 Ultra (3120×1440, 6.8" AMOLED) — also works on any phone.

---

## Architecture

**Philosophy:** Hybrid engine — database is the *bouncer*, AI is the *stylist*.

Flow per generation:
1. **Context capture** — GPS/weather → environment toggle (Outdoor / Indoor AC) → event → mode
2. **Filter engine** — Supabase query strips items that violate weather / formality / layer gates
3. **Style profile injection** — hidden blueprint (fits, palette, avoided combos, signature combos)
4. **AI assembly** — Gemini receives shortlist + profile, returns 2–3 structured outfits
5. **Render** — One UI cards with reasoning, save/rate/wear tracking

---

## Database Schema

```
categories      (id, name, layer_type)
items           (id, name, category_id, image_url, colors, fit, sleeve_length,
                 can_be_worn_open, material[], formality 1-5, vibe[],
                 min_temp_c, max_temp_c, occasions[], times_of_day[],
                 times_worn, last_worn_at, notes)
outfits         (id, items[], context JSONB, ai_reasoning, rating, worn_at)
style_profile   (id, name, body metrics, preferred fits/colors,
                 avoided_combinations JSONB, signature_combos JSONB)
modes           (id, name, rules JSONB)  — Quick / Church / Travel / Impress / Night
```

Layer types: `base`, `mid`, `outer`, `bottom`, `footwear`, `accessory`, `headwear`, `eyewear`, `timepiece`, `jewelry`.

Layering rule: AI may stack base + mid + outer, but never two of same layer. `can_be_worn_open=true` on a shirt lets it sit as mid over a base tee.

---

## File structure

```
WearWise App/
├── PLAN.md                     # this file
├── for-user-to-do.md           # manual steps (Supabase, API keys, Vercel)
├── README.md
├── .env.local.example
├── .gitignore
├── next.config.mjs             # + next-pwa
├── tailwind.config.ts          # One UI tokens
├── postcss.config.mjs
├── tsconfig.json
├── package.json
├── public/
│   ├── manifest.webmanifest
│   ├── icons/  (192, 512, maskable, apple-touch)
│   └── splash/
├── supabase/
│   ├── schema.sql
│   └── seed.sql
└── src/
    ├── app/
    │   ├── layout.tsx                 # Root + One UI shell + PWA meta
    │   ├── globals.css                # Tokens + One UI primitives
    │   ├── page.tsx                   # Home (Today)
    │   ├── wardrobe/page.tsx
    │   ├── wardrobe/add/page.tsx
    │   ├── wardrobe/[id]/page.tsx
    │   ├── outfits/page.tsx
    │   ├── modes/page.tsx
    │   ├── profile/page.tsx
    │   ├── offline/page.tsx
    │   └── api/
    │       ├── weather/route.ts
    │       ├── generate/route.ts      # the engine
    │       ├── tag-item/route.ts      # Gemini Vision tag extraction
    │       ├── clean-image/route.ts   # Gemini 2.5 Flash Image bg-removal
    │       └── upload/route.ts        # Supabase Storage signed url
    ├── components/
    │   ├── oneui/                     # OneUI primitives
    │   │   ├── Squircle.tsx
    │   │   ├── OneUIButton.tsx
    │   │   ├── OneUIToggle.tsx
    │   │   ├── OneUIChip.tsx
    │   │   ├── OneUISheet.tsx
    │   │   └── OneUIHeader.tsx
    │   ├── BottomNav.tsx
    │   ├── WeatherWidget.tsx
    │   ├── EnvironmentToggle.tsx
    │   ├── TripModePicker.tsx
    │   ├── ModeSelector.tsx
    │   ├── GenerateButton.tsx
    │   ├── OutfitCard.tsx
    │   ├── ItemCard.tsx
    │   ├── WardrobeGrid.tsx
    │   ├── AddItemForm.tsx
    │   └── StyleBlueprint.tsx
    ├── lib/
    │   ├── supabase/client.ts
    │   ├── supabase/server.ts
    │   ├── supabase/types.ts          # generated-like types
    │   ├── gemini.ts                  # SDK wrapper
    │   ├── weather.ts                 # OpenWeather client
    │   ├── filter-engine.ts           # the bouncer
    │   ├── style-profile.ts           # prompt injection
    │   ├── prompts.ts                 # generation + tagging prompts
    │   ├── modes.ts                   # Quick / Church / Travel / Impress
    │   ├── pwa.ts                     # install prompt hook
    │   └── constants.ts
    └── types/
        └── index.ts
```

---

## Execution Checklist

### Phase 1 — Foundation
- [x] Create folder layout
- [x] `PLAN.md` (this file)
- [x] `for-user-to-do.md`
- [ ] `package.json` + deps (no create-next-app — manual, faster & avoids prompts)
- [ ] `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`
- [ ] `.gitignore`, `.env.local.example`, `README.md`
- [ ] Initialize git

### Phase 2 — Design System (One UI)
- [ ] `globals.css` — true black bg, One UI typography (SamsungOne / system), safe-area insets
- [ ] Tailwind tokens: crimson (active), silver (inactive), squircle radii
- [ ] Root `layout.tsx` — viewport, theme-color, PWA meta, status bar styling
- [ ] One UI primitives: Squircle, Button, Toggle, Chip, Sheet, Header
- [ ] `BottomNav.tsx` — reachability-first nav (Today / Wardrobe / Modes / Profile)

### Phase 3 — Data Layer
- [ ] Supabase schema (`supabase/schema.sql`) — tables, enums, policies, storage bucket
- [ ] Seed file (`supabase/seed.sql`) — default categories, modes, empty style profile
- [ ] TS types (`lib/supabase/types.ts`)
- [ ] Supabase clients (browser + server)

### Phase 4 — Pages
- [ ] Home (`app/page.tsx`) — weather, environment toggle, trip toggle, mode chip row, generate button, outfit carousel
- [ ] Wardrobe grid (`app/wardrobe/page.tsx`)
- [ ] Add item (`app/wardrobe/add/page.tsx`) — photo upload → clean-image → tag → confirm → save
- [ ] Item detail (`app/wardrobe/[id]/page.tsx`)
- [ ] Outfits history (`app/outfits/page.tsx`)
- [ ] Modes (`app/modes/page.tsx`) — Quick / Church / Travel / Impress presets
- [ ] Profile (`app/profile/page.tsx`) — Style Blueprint editor

### Phase 5 — Intelligence
- [ ] `lib/weather.ts` — OpenWeather (current + forecast for trip mode)
- [ ] `api/weather/route.ts`
- [ ] `lib/filter-engine.ts` — weather gate, formality gate, layer compat, color math
- [ ] `lib/style-profile.ts` — fetch + format for prompt
- [ ] `lib/prompts.ts` — generation + tagging system prompts
- [ ] `lib/gemini.ts` — `@google/genai` wrapper, JSON mode
- [ ] `api/generate/route.ts` — the engine: context → filter → prompt → JSON outfits
- [ ] `api/tag-item/route.ts` — Gemini Vision tag extraction (user approves)
- [ ] `api/clean-image/route.ts` — Gemini 2.5 Flash Image background removal
- [ ] `api/upload/route.ts` — Supabase Storage signed-url upload

### Phase 6 — PWA
- [ ] `public/manifest.webmanifest`
- [ ] Icons (generate from one master SVG — later user may swap)
- [ ] `next-pwa` setup + offline page
- [ ] iOS/Android splash + theme-color meta
- [ ] Install prompt hook

### Phase 7 — Ship
- [ ] Final `README.md`
- [ ] Git init + initial commit
- [ ] GitHub repo `wearwise-by-algothrim` (public, owner TheAlgo7) via `gh`
- [ ] Vercel link + deploy (flag env vars needed in `for-user-to-do.md`)
- [ ] Update README with live URL

---

## Prompt design (locked)

**Generation prompt skeleton:**
```
SYSTEM: You are WearWise, Gaurav's personal stylist. Output strict JSON.
INPUT:
  style_blueprint: { ... }
  context: { temp_c, condition, time_of_day, environment, event, mode }
  candidates: [ {id,name,category,layer_type,colors,fit,sleeve_length,can_be_worn_open,formality,vibe[]} , ... ]
RULES:
  - Use ONLY provided candidate item ids.
  - Never stack two items of same layer_type.
  - A mid-layer shirt with can_be_worn_open=true may sit over a base layer tee.
  - Respect blueprint.avoided_combinations.
  - Prefer items not worn in last 3 days when equal.
OUTPUT: { outfits: [ {items:[id,...], reasoning:"1-2 sentences", confidence:0-1} , ... ] }  // 2-3 outfits
```

**Tagging prompt:** Gemini Vision returns JSON `{category, fit, sleeve_length, can_be_worn_open, primary_color, secondary_colors, material, formality, vibe, min_temp_c, max_temp_c, occasions, name_suggestions[]}`. User approves/edits in form.

---

## Modes (presets)

| Mode | Rule |
|---|---|
| Quick Fit | No event constraints; pick most-suited to weather & time of day. |
| Church (Sunday auto) | `formality >= 3`, exclude `gym`/`lounge` vibes, require clean palette. |
| Travel | Destination forecast override; favor layering-capable pieces, repeatability. |
| Impress | `formality >= 4`, signature combos boosted, avoid recently-worn. |
| Night | Dark palette boost, time_of_day includes `night`. |

---

## Non-goals (V1)
- No user auth — single-user device-local. Supabase RLS open for now (noted in for-user-to-do).
- No social sharing.
- No shopping integration.
- No calendar sync — manual event input via chips.
