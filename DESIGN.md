# WearWise — Design Reference

> Quick reference for colors, type, components, and icon specs. Updated when the design system changes.

---

## Color Palette

| Token | Hex | Usage |
| --- | --- | --- |
| `#000000` | Pure black | App background (AMOLED) |
| `#1A1819` | Card surface | All cards, nav pill |
| `#E2335D` | Crimson — primary accent | Buttons, active states, highlights |
| `#BB165F` | Crimson dark | Button hover, pressed state |
| `#FF86A0` | Crimson light | Labels, eyebrows, icons |
| `#FFEDE8` | Fog 100 | Primary headings |
| `#FFD9DA` | Fog 200 | Body text |
| `#D9C8CC` | Fog 300 | Secondary text |
| `#A89098` | Fog 400 | Muted / disabled text |
| `rgba(255,255,255,0.05)` | — | Card border |
| `rgba(255,255,255,0.08)` | — | Secondary button bg |

**Rule:** Never use pure white `#fff` or neutral gray. All text and surfaces are tinted toward crimson.

---

## Typography

Font stack: `SamsungOne`, `SF Pro Display`, `system-ui`, `-apple-system`, `Roboto`, sans-serif

| Class | Size | Weight | Line-height | Use |
| --- | --- | --- | --- | --- |
| `text-oneui-hero` | 32px | 600 | 38px | Page hero numbers |
| `text-oneui-title` | 26px | 600 | 32px | Section titles |
| `text-oneui-h` | 20px | 600 | 26px | Card headings |
| `text-oneui-body` | 15px | 400 | 21px | Body text, reasoning |
| `text-oneui-cap` | 12px | 500 | 17px | Labels, chips, metadata |
| `text-oneui-tab` | 11px | 600 | 14px | Nav labels, micro text |

Page headers use `text-[30px] font-semibold leading-[1.2] tracking-tight`.

---

## Cards

All cards use `.glass-card` (aliased to `.app-card`):

```css
background: #1A1819;
border-radius: 20px;
border: 1px solid rgba(255, 255, 255, 0.05);
```

**Never** nest cards inside cards. **Never** use glassmorphism (blur/backdrop-filter).

Squircle radius variants:
- `sm` → `rounded-[14px]`
- `md` → `rounded-[20px]` (default)
- `lg` → `rounded-[26px]`
- `xl` → `rounded-[32px]`

---

## Spacing

Base unit: 4px. Scale: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96

Page horizontal padding: `px-4` (16px) or `px-5` (20px) for headers.
Reach zone gap between cards: `gap-3` (12px).

---

## Interactions

Every tap target gets `.press`:

```css
transition: transform 100ms;
active: scale(0.97);
```

No bounce easing. No elastic. Deceleration only.

---

## Bottom Nav

Floating pill, fixed bottom, `z-50`. Height: `h-14` (56px) per tab.
Active state: `bg-[#E2335D]/30` fill, `text-[#FFEDE8]`, stroke-width 2.4.
Inactive: `text-white/40`, stroke-width 1.8.
Safe area: `padding-bottom: calc(env(safe-area-inset-bottom) + 16px)`.

---

## App Icons

Current icon: stylized **W** — two chevrons + hanger dot, crimson gradient on AMOLED black.

### Files to replace for a custom icon

| File | Purpose | Notes |
| --- | --- | --- |
| `public/icons/icon.svg` | Main icon (PWA, browser tab, shortcuts) | 512×512 viewBox |
| `public/icons/icon-maskable.svg` | Android adaptive icon | Content must sit within the **central 80%** (≈ x:51–461, y:51–461 on a 512×512 canvas). Corners get clipped by the OS. |
| `public/icons/apple-touch-icon.svg` | iOS home screen icon | 180×180 effective size. iOS adds its own rounded corners — do not add them yourself. |

### How to add a custom photo/image as the icon

1. Prepare a **square PNG, minimum 1024×1024**. Use a photo of a clothing item, a logo, or any personal image.
2. Open in [Figma](https://figma.com), [Photopea](https://photopea.com), or any image editor.
3. For `icon.svg` / `apple-touch-icon.svg`: place your image centered on a `#000000` square background, export as SVG (embed the image as base64) or swap to PNG and update `manifest.webmanifest` + `layout.tsx` to point to `.png` files.
4. For `icon-maskable.svg`: keep the image content within the central 80% — add ~10% padding on each side.
5. Update `manifest.webmanifest` if you change file names or formats.

### Quickest path (PNG swap)

```
public/icons/icon-192.png       → 192×192 PNG
public/icons/icon-512.png       → 512×512 PNG
public/icons/icon-maskable.png  → 512×512 PNG (content in central 80%)
```

Then in `manifest.webmanifest`:
```json
"icons": [
  { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
  { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
  { "src": "/icons/icon-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
]
```

And in `src/app/layout.tsx` update the `icons` field in metadata to point to the new PNGs.

---

## Greeting Logic

Home page heading changes by hour (`src/app/page.tsx`):

| Hours | Greeting |
| --- | --- |
| 4–6 AM | "Can't sleep?" |
| 6–9 AM | "Early start." |
| 9 AM–12 PM | "Morning, Gaurav." |
| 12–2 PM | "Midday already." |
| 2–5 PM | "Afternoon, Gaurav." |
| 5–8 PM | "Evening plans?" |
| 8–11 PM | "Night out?" |
| 11 PM–4 AM | "Night owl mode." |

---

## Mode Icons

| Mode | Icon (Lucide) | Color |
| --- | --- | --- |
| Quick Fit | `Zap` | `#E2335D` on `#E2335D/15` bg |
| Church | `Church` | same |
| Travel | `Plane` | same |
| Impress | `Star` | same |
| Night | `Moon` | same |

---

*Last updated: April 2026*
