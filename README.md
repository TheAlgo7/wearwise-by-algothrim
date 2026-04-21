# WearWise

> *Dress like you already know what you're doing.*

**Personal AI wardrobe & outfit generator — built exclusively for The Algothrim | Gaurav Kumar**

[![Live App](https://img.shields.io/badge/Live%20App-wearwise--by--algothrim.vercel.app-E2335D?style=for-the-badge&logo=vercel&logoColor=white)](https://wearwise-by-algothrim.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)

Photograph your clothes once. Every time you open the app, get 2–3 complete outfits built for today's weather, your location, and whatever mode you're in — Church on Sundays, Travel, Impress, or just a quick morning grab. A hidden Style Blueprint is injected on every call so the output sounds like your own judgement, not a generic fashion bot.

---

## How It Works

**Stage 1 — The Bouncer**
Filters your wardrobe by real constraints before AI ever sees it: temperature (bottoms always pass through), formality range, vibe tags, and recency scoring. Results are sliced by layer — tops, bottoms, footwear, watches, and accessories each have their own guaranteed slots so nothing gets crowded out.

**Stage 2 — The Stylist**
Takes the shortlist and generates 2–3 complete outfits with reasoning. Multi-provider fallback: Groq → OpenRouter → Gemini so generation always works. Watch and belt are included by default when they exist in candidates. Server-side rules enforce one item per layer slot, ties only with dress shirts, and no duplicate items — even when the model ignores the prompt.

---

## Features

| Feature | Description |
| --- | --- |
| **Generate Fit** | Tap once — 2–3 outfits for today's weather, mode, and environment |
| **10 Modes** | Quick · Home · Casual · Smart · Gym · Church · Travel · Impress · Night · Describe |
| **Describe Mode** | Type the occasion in plain English — the AI dresses accordingly |
| **When Chips** | Plan for right now, tonight, or tomorrow |
| **Trip Mode** | Enter any city — uses that forecast instead of your GPS |
| **Indoor AC** | Overrides effective temperature to 22°C |
| **Watch + Belt** | Always included when available and formality matches |
| **Add Item** | Photograph a piece — AI removes background and auto-tags everything |
| **Outfit History** | Every "Wearing this" tap is logged with weather and mode context |
| **Style Blueprint** | Private profile of fits, palette, and rules injected into every prompt |
| **Church Auto-mode** | Sundays default to Church mode automatically |
| **PWA** | Installs to home screen, service worker for offline resilience |
| **AMOLED design** | Pure black, flat matte cards, crimson accent — Samsung One UI 8.5 |

---

## Stack

| Layer | Tech |
| --- | --- |
| Framework | Next.js 16 App Router · React 19 · TypeScript 5.7 |
| Styling | Tailwind CSS — Samsung One UI 8.5 design language |
| Database | Supabase (Postgres + Storage) with RLS |
| AI — Outfits | Groq `llama-3.3-70b` → OpenRouter → Gemini 2.0 Flash |
| AI — Tagging | Gemini 2.0 Flash Vision — auto-tags new items from photo |
| AI — BG Removal | Gemini 2.0 Flash Image |
| Weather | OpenWeather API |
| Hosting | Vercel |

---

## Project Structure

```text
src/
  app/
    api/           generate · tag-item · clean-image · upload · weather
    page.tsx       Home — greeting, controls, outfit cards
    wardrobe/      Grid, add flow, item detail
    outfits/       Outfit history
    profile/       Style Blueprint editor
    modes/         Mode picker
  components/
    oneui/         Design system — Button, Chip, Toggle, Header, Sheet
    OutfitCard     Scrollable item strip, name pills, reasoning, actions
    OutfitDetailSheet  Full-screen outfit breakdown
    WeatherWidget  Live weather card
    AddItemForm    Photo → AI tag → confirm → save
  lib/
    filter-engine  Temperature, formality, vibe, and recency gates
    llm            Multi-provider JSON generation
    prompts        System prompt + candidate builder
    style-profile  Style Blueprint fetcher and formatter
    modes          Default mode rules and Sunday auto-detection
public/
  icons/           icon-192.png · icon-512.png · icon-maskable-512.png · icon.ico
  manifest.webmanifest
  sw.js            Service worker
supabase/
  schema.sql       Full schema — tables, triggers, RLS, storage policy
  seed.sql         29 categories, 10 modes, style_profile seed
```

---

## Run Locally

```bash
git clone https://github.com/TheAlgo7/wearwise-by-algothrim
cd wearwise-by-algothrim
npm install
npm run dev
```

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENWEATHER_API_KEY=
GEMINI_API_KEY=
GROQ_API_KEY=
OPENROUTER_API_KEY=
NEXT_PUBLIC_DEFAULT_CITY=New Delhi,IN
```

Run `supabase/schema.sql` then `supabase/seed.sql` against a new Supabase project.

---

**Built for one person. Works exactly for that one person.**

`v1.3` · Samsung One UI 8.5 · April 2026
