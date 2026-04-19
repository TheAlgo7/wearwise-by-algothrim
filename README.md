# WearWise

> Personal AI wardrobe & outfit generator — custom built for **The Algothrim | Gaurav Kumar**

A PWA for the Samsung Galaxy S24 Ultra. You photograph your clothes once. After that, every morning you get 2–3 outfits generated specifically for today's weather, your location, and whatever mode you're in — Church, Travel, Impress, or just a regular day.

**Live:** [wearwise-algothrim.vercel.app](https://wearwise-algothrim.vercel.app)

---

## How it works

The engine is split into two stages intentionally:

**Stage 1 — The Bouncer (database)**
Filters your wardrobe by real constraints before AI ever sees it: outdoor temperature ± 2°C tolerance, formality range, time of day, layer gates, recency scoring. Caps the shortlist at 35 items. If fewer than 3 pass, it stops and tells you why rather than hallucinating.

**Stage 2 — The Stylist (Gemini 2.5 Flash)**
Takes the filtered shortlist and generates 2–3 complete outfits with reasoning. Gets a hidden Style Blueprint on every call — a private profile of your aesthetic, fit preferences, and what to avoid — so the output sounds like your own judgement, not a generic fashion bot.

**Layering logic** is handled explicitly: base layer only, base + open overshirt, base + mid + outer. The `can_be_worn_open` flag on button-downs means a flannel shirt over a tee is a real option.

**Indoor AC override** sets the effective temperature to 22°C when you're spending the day inside. **Trip Mode** pulls the destination city's forecast instead of your coordinates.

---

## Stack

| Layer | Tech |
| --- | --- |
| Framework | Next.js 16 App Router, React 19, TypeScript |
| Styling | Tailwind CSS — Samsung One UI 8.5 design language |
| Database | Supabase (Postgres + Storage) |
| AI | Gemini 2.5 Flash (outfits + tagging), Gemini 2.5 Flash Image (bg removal) |
| Weather | OpenWeather API |
| Hosting | Vercel |

---

## Features

- **Add Item flow** — photograph a piece, Gemini removes the background and auto-tags category, layer type, fit, formality, weather range, and vibe. One tap to confirm.
- **5 modes** — Quick, Church (auto on Sundays), Travel, Impress, Night — each with its own rules passed to the AI
- **Outfit history** — every "I'm wearing this" tap is logged with context (temp, mode, city)
- **Style Blueprint** — a private profile injected into every generation prompt
- **PWA** — installs on the S24 Ultra home screen, custom service worker for offline resilience, no browser chrome
- **Samsung One UI 8.5 aesthetic** — flat matte cards, floating pill nav, `#E2335D` pink accent, pure black AMOLED background

---

## Project structure

```text
src/
  app/
    api/           Route handlers — generate, tag-item, clean-image, upload, weather
    page.tsx       Home — viewing area + controls + outfit cards
    wardrobe/      Grid, add flow, item detail
    modes/         Mode picker + outfit history
    profile/       Style Blueprint editor
  components/
    oneui/         Design system primitives — Button, Chip, Toggle, Header, Squircle
    WeatherWidget, GenerateButton, OutfitCard, AddItemForm …
  lib/
    filter-engine  The bouncer — temperature, formality, vibe, recency gates
    prompts        System prompt, JSON schema, Style Blueprint formatter
    gemini         Thin wrapper over @google/genai
supabase/
  schema.sql       Full schema — enums, tables, triggers, storage bucket
  seed.sql         29 categories, 5 modes, singleton style_profile row
```

---

## Self-hosting

This repo is private and personal. The code is here for reference. If you want to run your own:

1. Create a Supabase project, run `supabase/schema.sql` then `supabase/seed.sql`
2. Get an [OpenWeather API key](https://openweathermap.org/api) and a [Google AI Studio key](https://aistudio.google.com)
3. Copy `.env.example` to `.env.local` and fill in the five variables
4. `npm install && npm run dev`

The app assumes a single user — RLS is disabled. Don't expose this publicly without adding auth.

---

## License

Unlicensed. Built for personal use.

---

Built by Gaurav Kumar (The Algothrim) · April 2026
