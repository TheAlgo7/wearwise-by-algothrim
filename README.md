# WearWise

A personal AI wardrobe and outfit generator built around Gaurav Kumar's own closet, style logic, and day-to-day decision flow. The app turns photographed clothing items into practical, weather-aware outfit suggestions with a more opinionated styling voice than a generic fashion recommender.

## What it does

- Organizes a personal wardrobe into reusable outfit inputs
- Generates outfit combinations from real clothing inventory
- Factors in weather, mode, and occasion context
- Uses an AI-backed recommendation pipeline with personal style constraints

## Stack

- Next.js
- React
- TypeScript
- Supabase
- AI provider integrations
- Image-processing utilities for wardrobe assets

## Key folders

- `src/app/` - routes and app screens
- `src/components/` - reusable UI pieces
- `src/hooks/` - client hooks and interaction helpers
- `src/lib/` - outfit logic, provider integration, and utilities
- `src/types/` - shared type definitions
- `supabase/` - backend and data-layer support
- `WearWise Clothes/` - local clothing asset organization

## Local development

1. Install dependencies with `npm install`.
2. Copy `.env.local.example` to `.env.local`.
3. Fill in the required keys for Supabase and AI providers.
4. Run `npm run dev`.
5. Use `npm run build`, `npm run start`, and `npm run type-check` before shipping major changes.

## Notes

- Current local package version is `1.3.0`.
- This repo is intentionally specialized around a personal wardrobe system rather than a broad multi-user SaaS product.
