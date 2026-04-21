<div align="center">

# WearWise

### *Dress like you already know what you're doing.*

**Personal AI wardrobe and outfit generator for The Algothrim — built around real clothes, real context, and actual taste.**

[![Live App](https://img.shields.io/badge/Live-wearwise--by--algothrim.vercel.app-E2335D?style=for-the-badge&logo=vercel&logoColor=white)](https://wearwise-by-algothrim.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![AI Pipeline](https://img.shields.io/badge/AI-Gemini%20%C2%B7%20Groq%20%C2%B7%20OpenRouter-E2335D?style=for-the-badge&labelColor=101010)](https://github.com/TheAlgo7/wearwise-by-algothrim)

*WearWise is not a fashion mood board generator. It is a wardrobe engine: photograph your real clothes once, tag them, store them, then let the system build grounded outfits around weather, occasion, mode, and your own style profile.*

</div>

---

## Overview

The point of WearWise is not to sound clever. It is to be useful before 9 AM. The app filters your wardrobe by real-world constraints first, then uses AI for the part AI is actually good at: assembling combinations, reasoning about vibe, and explaining why the outfit works.

The result feels closer to a personal stylist with memory than a random outfit generator.

## How The Engine Works

**Stage 1 — The Bouncer**  
Filters the wardrobe by temperature, formality, vibe, and recency before any model sees the candidate set.

**Stage 2 — The Stylist**  
Builds 2–3 complete outfits with reasoning using a multi-provider pipeline and a private style blueprint.

## Core Features

- **AI outfit generation** tuned to your actual wardrobe instead of a generic catalog.
- **Photo-to-closet flow** with background cleanup and AI-assisted tagging.
- **Modes and timing controls** for Church, Travel, Impress, tonight, tomorrow, and more.
- **Weather-aware suggestions** with location-sensitive output.
- **Outfit history** so the system remembers what has already been worn.
- **Personal style blueprint** injected into generation so the voice stays yours.

## Quick Start

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

Then initialize the database with:

- `supabase/schema.sql`
- `supabase/seed.sql`

Useful commands:

```bash
npm run build
npm run start
npm run lint
npm run type-check
```

## Project Structure

```text
src/
├── app/
│   ├── api/
│   ├── wardrobe/
│   ├── outfits/
│   ├── profile/
│   └── modes/
├── components/
├── hooks/
├── lib/
└── types/
public/
├── icons/
├── manifest.webmanifest
└── sw.js
supabase/
├── schema.sql
└── seed.sql
```

## Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 App Router + React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS with Samsung One UI-inspired direction |
| Data | Supabase Postgres + Storage |
| AI | Gemini, Groq, OpenRouter |
| Weather | OpenWeather API |
| Hosting | Vercel |

## Design Language

- **AMOLED-first.** Matte blacks, strong contrast, and disciplined red accents.
- **Samsung-inspired UI.** Rounded, touch-forward, modern without looking playful.
- **High signal, low noise.** Every screen is built to make getting dressed easier.
- **Personal by design.** The product is unapologetically built around one real wardrobe and one real taste profile.

<div align="center">

Built for **real clothes, real context, and better judgment at speed**.

</div>
