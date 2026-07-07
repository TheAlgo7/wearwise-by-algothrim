# Design System

## Theme

Dark. Forced — not a preference. The physical scene is a dim bedroom at 7am, a phone in one hand. The surface is deep near-black with warm undertones; not cold grey, not pure black. The crimson accent cuts through cleanly in low ambient light without glaring.

Color strategy: **Restrained**. Tinted near-black neutrals dominate. Crimson carries all active, primary, and AI-generated states — never scattered decoratively.

---

## Color Palette

### Background (ink scale)

| Token | Hex | Role |
|---|---|---|
| `ink-0` | `#000000` | Base canvas, document background |
| `ink-50` | `#0A0A0C` | Page-level background |
| `ink-100` | `#121012` | Primary app background |
| `ink-200` | `#1A1819` | Card and surface background |
| `ink-300` | `#1C1A1D` | Elevated surface (sheet backgrounds) |
| `ink-400` | `#252225` | Input backgrounds |
| `ink-500` | `#2F2C30` | Dividers, subtle borders |
| `ink-600` | `#3A363B` | Strong borders |

### Text (fog scale)

| Token | Hex | Role |
|---|---|---|
| `fog-100` | `#F5EEF0` | Primary body text |
| `fog-200` | `#D9C8CC` | Secondary text, inactive labels |
| `fog-300` | `#A89098` | Placeholder text, tertiary |
| `fog-400` | `#7A6870` | Disabled, ghost |
| `fog-500` | `#4A3A40` | Subtle divider tint |

### Accent (crimson scale)

| Token | Hex | Role |
|---|---|---|
| `crimson-50` | `#FFECEF` | High-emphasis text on dark (headings) |
| `crimson-100` | `#FFD9DA` | Secondary emphasis text |
| `crimson-200` | `#FFC4D0` | Warm highlight |
| `crimson-300` | `#FF86A0` | Icons on dark backgrounds, captions |
| `crimson-400` | `#E2335D` | Primary CTA, active states, generate button |
| `crimson-500` | `#C41C43` | Hover state for crimson-400 (same 346° hue as 400, darker — the old `#BB165F` drifted purple) |
| `crimson-600` | `#8B0F47` | Pressed state |
| `crimson-700` | `#5E0A31` | Deep accent, rarely used |

### Semantic

| Token | Hex | Role |
|---|---|---|
| `error` | `#7A1A1A` | Error background |
| `error-border` | `#9B2020` | Error border |
| `error-text` | `#FFCDD2` | Error text |

---

## Typography

Font stack: `SamsungOne`, `SF Pro Display`, `system-ui`, `Roboto`, `sans-serif`. Mimics the native Samsung OneUI system font experience.

### Type scale

| Token | Size / Leading | Weight | Usage |
|---|---|---|---|
| `text-oneui-hero` | 32px / 38px, -0.01em | 700 | Page hero titles, major headings |
| `text-oneui-title` | 26px / 32px, -0.01em | 600 | Section titles |
| `text-oneui-h` | 20px / 26px | 600 | Card headings, list item titles |
| `text-oneui-body` | 15px / 21px | 400 | Body text, descriptions |
| `text-oneui-cap` | 12px / 17px | 500 | Captions, labels, chips, metadata |
| `text-oneui-tab` | 12px / 15px | 600 | Bottom nav labels |

Hierarchy uses scale + weight contrast. Headings use `crimson-50`; captions use `fog-200` to `fog-400` depending on emphasis level.

---

## Elevation and Surfaces

Three surface levels. Never nest — a raised card inside a raised card is always wrong.

| Level | Class | Visual treatment |
|---|---|---|
| Page | — | `ink-100` background, no border |
| Flat card | `.app-card`, `.glass-card` | `ink-200`, `border-white/[0.05]`, `rounded-squircle` |
| Raised card | `Squircle variant="raised"` | `ink-200`, `border-white/[0.07]`, `shadow-card`, `rounded-squircle` |
| Glass card | `Squircle variant="glass"` | `bg-white/[0.04]`, `border-white/[0.06]`, `rounded-squircle` |

Sheet backgrounds (drawers, modals): One UI 9 glass — `rgba(18,16,18,0.84)` + `backdrop-filter: blur(32px) saturate(160%)`, `border-white/[0.08]` top/side border. Glass is reserved for floating surfaces (sheets, bottom nav); content cards stay opaque.

`shadow-card`: `0 1px 0 rgba(255,255,255,0.04) inset` — inner top highlight, gives perceived lift without a drop shadow.

---

## Border Radius

| Token | Value | Usage |
|---|---|---|
| `rounded-squircle-sm` | 14px | Small chips, tags, inputs |
| `rounded-squircle` | 20px | Standard cards |
| `rounded-squircle-lg` | 26px | Large cards, modal drawers |
| `rounded-squircle-xl` | 32px | Extra-large panels |
| `rounded-full` | 50% | Pills, icon buttons, nav items, chips |

---

## Components

### Buttons (OneUIButton)

Pill-shaped (`rounded-full`). Five intents:

- `primary`: `bg-crimson-400`, white text. The generate action.
- `secondary`: `bg-white/[0.08]`, `text-crimson-50`, subtle border. Secondary or cancel actions.
- `ghost`: transparent, `text-crimson-100`. Tertiary.
- `outline`: transparent, `border-white/[0.12]`. Structural alternative.
- `danger`: `bg-error`, `text-error-text`. Destructive actions.

Sizes: sm (h-10), md (h-12, default), lg (h-14), xl (h-16), icon (h-11 w-11).

Focus ring: `focus-visible:ring-2 focus-visible:ring-crimson-400 focus-visible:ring-offset-2`.

### Chips (OneUIChip)

Filter chips: h-9, `px-4`, `text-[13px]`. Mode chips: h-11, `px-5`, `text-[14px]`.

Active: `bg-crimson-400`, white text, no border. Inactive: `bg-white/[0.08]`, `text-fog-200`, `border-white/[0.08]`.

### Squircle

Structural card primitive with `variant` prop (`flat` | `raised` | `glass`). Always use the variant prop — never override background via className.

### Bottom Nav (BottomNav)

Fixed to bottom. Pill container: `bg-ink-200/70 border-white/[0.08] rounded-full` with `backdrop-blur(28px) saturate(190%)` (One UI 9 glass). Active nav item: `text-crimson-50`, `bg-crimson-400/30` pill highlight with `animate-oneui-pop`. Inactive: `text-white/40`. Tab label: `text-oneui-tab`.

### Generate Button (GenerateButton)

Full-width pill. `bg-crimson-400`, h-14, `text-[16px] font-semibold`. Loading state: `Loader2` spinner + "Styling you…". This is the primary action across the entire app.

### Mode Cards

Featured mode icon circle: `h-11 w-11 rounded-full bg-crimson-400/15`. Secondary mode icon circle: `bg-crimson-400/10`. Icon color: `text-crimson-300`, size 19–20.

### OneUIHeader

Page header component. Structure: eyebrow cap → hero title → subtitle. Uses `.oneui-hero` (crimson-50) + `.oneui-hero-sub` (crimson-300, uppercase, tracking-widest).

---

## Motion

### Timing

| Variable | Value | Usage |
|---|---|---|
| `--duration-fast` | 180ms | Micro-interactions, chip toggles |
| `--duration-base` | 240ms | Page-level transitions |
| `--ease-spring` | `cubic-bezier(0.22, 1, 0.36, 1)` | All easing. Ease-out expo feel. |

Never ease-in. No bounce, no elastic. Exponential out only.

### Named animations

- `animate-oneui-pop`: scale 0.97→1 + opacity 0→1, 180ms spring. Active state appearances (nav pill, modal entry).
- `animate-oneui-fade`: translateY 6px→0 + opacity 0→1, 220ms ease-out. Filter panel reveal.

### Reduced motion

Reactive via `MediaQueryList` event listener — not a one-time read. When `prefers-reduced-motion: reduce`, skip translate and scale animations.

### Press feedback

`.press`: `transition-transform duration-100 active:scale-[0.97]`. Applied to all interactive cards and buttons.

---

## Layout

### Reach zone

`.reach-zone`: `flex flex-col gap-3 px-4`, bottom padding accounts for nav + safe area inset. All main page content lives inside this.

### Horizontal safe area

`body` padding accounts for `env(safe-area-inset-*)` on all sides.

### Max width

Nav container uses `max-w-xl` centered. Pages themselves flow edge-to-edge within the safe area.

### Spacing rhythm

- Between cards: `gap-3` (12px)
- Internal card padding: `p-4`
- Header eyebrow margin: `mb-2`
- Between sections: `pt-1` to `pt-4`
- Page horizontal: `px-4` (16px)

---

## Accessibility

- All interactive elements: visible `focus-visible` ring (`ring-2 ring-crimson-400 ring-offset-2`).
- All form inputs: `<label>` with `htmlFor` or `aria-label`.
- Outfit generation status: `role="status" aria-live="polite"` region (screen-reader only).
- Error banners: `role="alert"`.
- Mode selectors: `role="radiogroup"` + `role="radio"` + `aria-checked`.
- Time-of-day chips: `role="group"` + `aria-pressed`.
- Bottom nav: `aria-label="Primary"` on `<nav>`.
- Touch targets: minimum 44px on all interactive elements.
- Images: `alt` text always provided; `sizes` hints for responsive loading.

---

## Greeting Logic

Home page heading changes by hour:

| Hours | Greeting |
|---|---|
| 4–6 AM | "Can't sleep?" |
| 6–9 AM | "Early start." |
| 9 AM–12 PM | "Morning, Gaurav." |
| 12–2 PM | "Midday already." |
| 2–5 PM | "Afternoon, Gaurav." |
| 5–8 PM | "Evening plans?" |
| 8–11 PM | "Night out?" |
| 11 PM–4 AM | "Night owl mode." |

---

## App Icons

PWA icons at `public/icons/`. Formats: SVG (primary), PNG fallbacks.

| File | Purpose | Notes |
|---|---|---|
| `icon.svg` | Main icon (PWA, browser tab) | 512×512 viewBox |
| `icon-maskable.svg` | Android adaptive icon | Content within central 80% |
| `apple-touch-icon.svg` | iOS home screen | 180×180 effective size; no rounded corners needed |

*Last updated: June 2026 — One UI 9 glass refresh*
