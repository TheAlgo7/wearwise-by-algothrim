# Design System

## Theme

Dark. Forced — not a preference. The physical scene is a dim bedroom at 7am, a phone in one hand. The surface is deep near-black with warm undertones; not cold grey, not pure black. The crimson accent cuts through cleanly in low ambient light without glaring.

Color strategy: **Restrained**. Tinted near-black neutrals dominate. Crimson carries all active, primary, and AI-generated states, never scattered decoratively.

### Where crimson is allowed

This was the rule from the start and the app had drifted a long way off it: headers, subtitles, section labels, chevrons, icons and captions were all crimson, so nothing crimson meant anything. The August 2026 pass put it back.

| Use | Token |
|---|---|
| Primary text, headings, item names | `fog-100` |
| Secondary and supporting text | `fog-200` → `fog-300` |
| Metadata, counts, hints | `fog-400` |
| Empty-state and placeholder icons | `fog-500` |
| **Selected / active state** | `bg-crimson-400`, white text |
| **Primary action** | `bg-crimson-400` |
| **AI reasoning surface** | `crimson-400/[0.06]` fill, `crimson-300` label |
| **Ishita signal** (her picks, her heart) | `crimson-300` |
| **Unread / new notification dot** | `crimson-400` |
| Focus ring | `ring-crimson-400` |

Anything not in that table is fog. Borders stay near-invisible (`white/[0.05]`–`white/[0.08]`), content cards stay opaque, and glass is reserved for the bottom nav and modal sheets.

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
| `crimson-600` | `#8A0F2C` | Pressed state (re-hued 333°→346° with 500) |
| `crimson-700` | `#5C0A1D` | Deep accent, rarely used (re-hued 332°→346° with 500) |

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

Hierarchy uses scale + weight contrast. Headings use `fog-100`; captions use `fog-200` to `fog-400` depending on emphasis level.

### No eyebrows

Every page used to open with an uppercase, letter-spaced, crimson label above its title: `WARDROBE`, `LOOKS`, `PRESETS`, `BLUEPRINT`. It cost a line, spent the accent on decoration, and restated the tab the user had just pressed. Pages lead with the title and one supporting sentence.

The same applies inside pages: section headings are `.section-title` (15px, semibold, `fog-100`, sentence case) with `.section-meta` (12px, `fog-400`) for the count or action beside them.

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

Filter chips: h-11 (44px), `px-4`, `text-[13px]`. Mode chips: h-12 (48px), `px-5`, `text-[14px]`.

Active: `bg-crimson-400`, white text, no border. Inactive: `bg-white/[0.06]`, `text-fog-200`, `border-white/[0.08]`.

### Squircle

Structural card primitive with `variant` prop (`flat` | `raised` | `glass`). Always use the variant prop, never override background via className.

### Context pill (`.context-pill`)

The single line that replaces a card full of controls. Min-height 44px, `rounded-full`, `bg-white/[0.05]`, `border-white/[0.08]`, `text-fog-200`, with a trailing affordance icon in `fog-400`. Two live instances:

- **Today** — `Delhi · 29° · Casual · Outdoor · Now`, opens `TodayContextSheet`.
- **Wardrobe and Ishita's home** — `Delhi · Monsoon wardrobe · 74 pieces`, opens `SeasonPill`'s sheet.

Place, then temperature, then choices: the facts the user did not pick come first, because those are the ones worth correcting.

### FAB (`.fab`)

56px crimson circle pinned to the lower-right reach zone, 16px in from the right and clear of the nav. Wardrobe's "add a piece" only. Carries a crimson drop shadow (`accent-600 / 0.5`), the one place in the app with a coloured shadow.

### Bottom Nav (BottomNav)

Fixed to bottom, floating pill. Container: `bg-ink-200/70 border-white/[0.08] rounded-full` with `backdrop-blur(28px) saturate(190%)` (One UI 9 glass).

Three destinations for the owner (Today, Wardrobe, Looks), four for the partner (Home, Wardrobe, Style him, Picks). Items are 48px tall with the icon stacked over an 11px label; **every label is always visible**. The old bar showed the label only on the active tab and animated its width, so the whole pill shifted under the thumb between taps.

Active item: `bg-crimson-400`, white text. Inactive: `text-fog-300`.

### Today's fit (TodayFit + OutfitComposition)

The home screen hero, roughly two thirds of the visible screen.

- `OutfitComposition` lays items out as a flat-lay on one `ink-0` canvas: top large in band one with layers beside it, bottom and shoes in band two, accessories along band three. **No per-item borders or cards** — those are what made the old version read as a product list rather than an outfit.
- Below it: the reasoning sentence in `fog-200`, then `Wear this` (h-14, crimson) and `Another option` (h-12, ghost). Save is a bookmark icon in the section header, not a third button.
- The alternatives are real but hidden. `Another option` walks the batch, then generates a fresh one when it runs out.

### OneUIHeader

Page header. Structure: title → optional subtitle → optional right-hand action. `.oneui-hero` is `fog-100`. No eyebrow prop exists.

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

**There is deliberately no `prefers-reduced-motion` override.** Gaurav runs reduce-motion ON at the OS level, and the blanket `animation-duration: 0.01ms !important` rule that used to sit in `globals.css` made the entire app static on the only phone it runs on. Every animation here is short, opacity-and-translate only, and never loops, so it stays on. Do not add that media query back.

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
- Looks view switcher: `role="tablist"` + `role="tab"` + `aria-selected`.
- Bottom nav: `aria-label="Primary navigation"` on `<nav>`.
- Touch targets: **48px** for navigation, segmented controls and primary actions (Android's guidance); 44px floor for secondary controls such as filter chips and inline text actions.
- Images: `alt` text always provided; `sizes` hints for responsive loading.

---

## Two experiences, one foundation

The roles are not one interface with two permission levels. They are two jobs.

| | Gaurav (owner) | Ishita (partner) |
|---|---|---|
| Job | Decide what to wear, fast | Choose for him, deliberately |
| Home leads with | One generated outfit | One big **Style him** action |
| Primary action | `Wear this` | `Send this look to Gaurav` |
| Navigation | Today · Wardrobe · Looks | Home · Wardrobe · Style him · Picks |
| Shared | Wardrobe shelves, Looks, one identity | Wardrobe shelves, Looks, one identity |

Her builder is outfit-aware: `base`, `mid`, `outer`, `bottom` and `footwear` are one-piece slots, so a second pick in the same layer replaces the first. Accessories, eyewear, headwear, watches and jewellery stack. The send button stays disabled until top, bottom and shoes are all present, with the tray reading `Top ✓ Bottom ✓ Shoes missing`. An essential the wardrobe cannot fill under the current filter is dropped from the requirement rather than becoming a dead end.

---

## Greeting Logic

`src/lib/greetings.ts` builds a candidate pool from everything the app knows at open (hour bucket, weekday, season, temperature, condition, unseen picks, wardrobe size), weights contextual lines twice, and excludes the last six greetings shown. It is not a fixed if-ladder on the hour.

Voice, owner: composed and dry, never cheerful. Voice, partner: warm; she is a guest in his wardrobe and should feel wanted.

---

## App Icons

PWA icons at `public/icons/`. Formats: SVG (primary), PNG fallbacks.

| File | Purpose | Notes |
|---|---|---|
| `icon.svg` | Main icon (PWA, browser tab) | 512×512 viewBox |
| `icon-maskable.svg` | Android adaptive icon | Content within central 80% |
| `apple-touch-icon.svg` | iOS home screen | 180×180 effective size; no rounded corners needed |

*Last updated: August 2026, the "Focus" pass: decision-first home, three-tab owner navigation, crimson restraint, outfit-aware builder.*
