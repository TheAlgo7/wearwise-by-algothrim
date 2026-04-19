# WearWise

**Custom made for The Algothrim | Gaurav Kumar**

A personal AI-driven wardrobe & outfit generator built as a PWA for the Samsung Galaxy S24 Ultra. Hybrid engine — the database is the bouncer (weather / formality / layer gates), the AI is the stylist (fresh combinations from a pre-filtered shortlist), and a hidden Style Blueprint keeps everything anchored to the owner's taste.

---

## Why this exists

Relying on a chat window every day to pick outfits is friction. WearWise removes the decision: it reads the weather, knows whether you're indoors in AC or outdoors in 40 °C, understands layering (base / mid / outer), respects event context (Quick / Church / Travel / Impress / Night), and returns 2–3 clean outfits in one tap.

---

## Stack

- **Next.js 15** (App Router, React 19, Server Components)
- **TypeScript** strict
- **Tailwind CSS** with a bespoke Samsung One UI token system (true black AMOLED + Crimson Nitro accent)
- **Supabase** (Postgres + Storage)
- **Google Gemini** (2.5 Flash for reasoning/tagging, 2.5 Flash Image for background removal)
- **OpenWeather** (current + forecast for Trip Mode)
- **PWA** — installs native-feel on S24 Ultra with offline cache

---

## Getting started

1. Read [`for-user-to-do.md`](./for-user-to-do.md) — it walks you through the five manual account/API-key steps (Supabase, OpenWeather, Gemini, Vercel env vars, PWA install).
2. `cp .env.local.example .env.local` and paste your keys.
3. ```bash
   npm install
   npm run dev
   ```
4. Open http://localhost:3000 on your phone (same Wi-Fi) or your desktop.

---

## Project structure

See [`PLAN.md`](./PLAN.md) for the full architecture, database schema, and file map.

---

## Built by

[**The Algothrim**](https://algothrim.com) · Gaurav Kumar · 2026
