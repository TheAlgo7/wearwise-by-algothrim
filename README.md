<div align="center">

# 👔 WearWise

### *Dress like you already know what you're doing.*

**Personal AI wardrobe & outfit generator — built exclusively for The Algothrim | Gaurav Kumar**

[![Live App](https://img.shields.io/badge/Live%20App-wearwise--algothrim.vercel.app-E2335D?style=for-the-badge&logo=vercel&logoColor=white)](https://wearwise-algothrim.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed-Vercel-000?style=for-the-badge&logo=vercel)](https://vercel.com)

---

*You photograph your clothes once. After that, every time you open the app you get 2–3 complete outfits built specifically for today's weather, your location, and whatever mode you're in — Church, Travel, Impress, or just a regular morning. The AI gets a hidden style profile on every call so the output sounds like your own judgement, not a generic fashion bot.*

</div>

---

## 🧬 How It Works

The engine runs in two stages:

**Stage 1 — The Bouncer (database)**
Filters your wardrobe by real constraints before AI ever sees it: temperature tolerance (±2°C), formality range, time of day, layer gates, and recency scoring. Caps the candidate list at 20 items. If fewer than 3 pass the filters, it stops and tells you exactly why rather than hallucinating an outfit.

**Stage 2 — The Stylist (multi-provider AI)**
Takes the shortlist and generates 2–3 complete outfits with reasoning. Fallback chain: Groq → OpenRouter → Gemini — so generation always works even when one provider hits rate limits. The model receives a compact Style Blueprint on every call — a private profile of fit preferences, avoided combinations, and signature combos — so it assembles outfits that actually feel like you.

**Layering logic** is explicit: `base`, `mid` (can be worn open or closed), `bottom`, `outer`. The `can_be_worn_open` flag on button-downs means an open flannel over a tee is a real valid option. Server-side deduplication enforces one item per layer slot post-generation so two shirts never appear in the same outfit even when the AI ignores the rule.

**Indoor AC override** sets the effective temperature to 22°C for air-conditioned environments. **Trip Mode** pulls the destination city's forecast instead of your current GPS location.

---

## 🌍 Live App

**[→ wearwise-algothrim.vercel.app](https://wearwise-algothrim.vercel.app)**

PWA — install from Chrome on Samsung to home screen. Full standalone mode, no browser chrome.

---

## ⚙️ Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 App Router, React 19, TypeScript 5.7 |
| Styling | Tailwind CSS — Samsung One UI 8.5 design language |
| Database | Supabase (Postgres + Storage) |
| AI — Outfits | Groq `llama-3.3-70b` → OpenRouter Gemini/Llama → Google Gemini 2.0 Flash |
| AI — Tagging | Gemini 2.0 Flash (vision) — auto-tags new items from photo |
| AI — BG Removal | Gemini 2.0 Flash Image — removes background on upload |
| Weather | OpenWeather API |
| Hosting | Vercel (hobby, 30s function limit) |

---

## 🧩 Features

| Feature | What it does |
|---|---|
| **Generate Fit** | Tap once — 2–3 outfits assembled for today's weather, mode, and environment |
| **5 Modes** | Quick Fit · Church (auto-activates Sundays) · Travel · Impress · Night |
| **Trip Mode** | Enter any city — uses that city's forecast instead of your GPS |
| **Indoor AC** | Overrides effective temperature to 22°C for AC-heavy days |
| **Add Item** | Photograph a piece — AI removes the background and auto-tags everything |
| **Outfit History** | Every "Wearing this" tap is logged with temp, mode, and city context |
| **Style Blueprint** | Private profile (fits, palette, rules) injected into every generation prompt |
| **Time-aware greeting** | "Morning, Gaurav." → "Night owl mode." — changes with the hour |
| **PWA** | Installs on home screen, service worker for offline resilience |
| **AMOLED design** | Pure black, flat matte cards, crimson accent — matches Samsung One UI 8.5 |

---

## 🗂️ Project Structure

```
src/
  app/
    api/             Route handlers — generate, tag-item, clean-image, upload, weather
    page.tsx         Home — time-aware greeting, controls, outfit cards
    wardrobe/        Grid, add flow (/add), item detail (/[id])
    modes/           Mode picker → redirects to Today with mode applied
    outfits/         Outfit history log
    profile/         Style Blueprint editor
  components/
    oneui/           Design system primitives — Button, Chip, Toggle, Header, Sheet, Squircle
    OutfitCard       Outfit result card — item strip, name pills, reasoning, actions
    ItemCard         Wardrobe grid card — photo + name + fit
    WeatherWidget    Live weather — temp, condition, humidity, wind
    AddItemForm      Full add-item flow — photo → AI tag → confirm → save
    GenerateButton   The big crimson CTA
    BottomNav        Floating pill nav — Today · Wardrobe · Modes · Profile
  lib/
    filter-engine    The bouncer — temperature, formality, vibe, recency gates
    llm              Multi-provider JSON generation (Groq → OpenRouter → Gemini)
    prompts          System prompt, JSON schema, candidate builder
    style-profile    Style Blueprint fetcher + blueprint formatter
    modes            Default mode definitions + fallback rules
    weather          OpenWeather fetch helpers
    gemini           @google/genai wrapper for vision routes
public/
  icons/             SVG app icons — icon.svg, icon-maskable.svg, apple-touch-icon.svg
  manifest.webmanifest
  sw.js              Service worker — offline fallback
supabase/
  schema.sql         Full schema — enums, tables, triggers, storage bucket policy
  seed.sql           29 categories, 5 modes, singleton style_profile row
```

---

## 🚀 Run Locally

```bash
git clone https://github.com/TheAlgo7/wearwise-by-algothrim
cd wearwise-by-algothrim
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Environment variables** — copy `.env.example` to `.env.local`:

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

**Database:** Create a Supabase project, run `supabase/schema.sql` then `supabase/seed.sql`.

> Single-user app. RLS is disabled by design. Don't expose publicly without adding auth.

---

## 🎨 Design

Samsung One UI 8.5 — feels like a native Samsung app, not a web app.

- **Background:** AMOLED black `#000000`
- **Cards:** Flat matte `#1A1819` · `border: 1px solid rgba(255,255,255,0.05)`
- **Accent:** Crimson `#E2335D` · matches the phone's personalization color
- **Text ramp:** `#FFEDE8` → `#FFD9DA` → `#FF86A0`
- **Nav:** Floating pill, safe-area aware
- **Tap feedback:** `active:scale-[0.97]` on every interactive surface

Full token reference: [`DESIGN.md`](DESIGN.md)

---

<div align="center">

**Built for one person. Works exactly for that one person.**

`v1.0` · Samsung One UI 8.5 · April 2026

</div>
