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
| Selected segment, filter chip, multi-select chip | `.seg-item[aria-checked]` / `OneUIChip active`: raised `ink-500`, `fog-100` text |
| **Primary action** (Wear this, Done today, Style him, the add FAB) | `bg-crimson-400` |
| **Active nav tab** | `bg-crimson-400` |
| **AI reasoning surface** | `crimson-400/[0.06]` fill, `crimson-300` label |
| **Ishita signal** (her picks, her heart) | `crimson-300` |
| **Genuinely overdue or due today** (Care) | `crimson-300` text |
| **Unread / new notification dot** | `crimson-400` |
| Focus ring | `ring-crimson-400` |

Anything not in that table is fog. Borders stay near-invisible (`white/[0.05]` to `white/[0.08]`), content cards stay opaque, and glass is reserved for the bottom nav and modal sheets.

**September 2026: selection went neutral.** Segmented controls, filter chips and the profile's multi-select chips used to be solid crimson when chosen. The Looks screen had four crimson pills on it (tab, filter, nav, and seventeen tinted "Wearing this" buttons) before you reached a single look. A view switcher or a filter is navigation, not a decision, so its selected state is a raised neutral. Crimson is spent on doing something.

### Colour from the clothes

The app's own palette is quiet on purpose; the colour comes from what he owns. `lib/colour-story.ts` maps each item's `primary_color` to a garment swatch and gives every outfit:

- **Swatches**: up to four colours, clothes before accessories, shown under the plate on Today, in the outfit sheet, and as dots on Looks tiles and wardrobe cards.
- **A light** (`--story`): the first non-neutral colour. `.fit-stage` spills it around the outfit plate, never onto it, so a black shirt still photographs black. `--story` is a registered `@property`, so a new outfit fades its light in over 900ms.

### Photo plates

Most garment photos are flattened onto black with a faint vignette, not cut out with alpha (checked: 4 of 5 sampled are RGB with a black corner). On pure black that vignette showed as a dark box around trousers and shirts. Every photo now sits on `.photo-well`: a floor of `--well` (21 16 17) with `mix-blend-mode: lighten` on the image, which dissolves the black box into the floor. Use `.photo-well` for any garment photo; never `bg-ink-0` or `bg-black`.

---

## Color Palette

### Background (ink scale)

Rebuilt in OKLCH on the accent's own hue (about 10°) in September 2026. The old `ink-200` and `ink-300` were two RGB points apart, so raised and flat surfaces were the same colour; every step is now visibly distinct.

| Token | Hex | OKLCH | Role |
|---|---|---|---|
| `ink-0` | `#000000` | | Base canvas, AMOLED black |
| `ink-50` | `#090606` | 12.5% 0.008 10 | Page-level background |
| `ink-100` | `#110C0C` | 16% 0.010 10 | Sheet background |
| `ink-200` | `#1B1415` | 20% 0.012 10 | Card and surface |
| `ink-300` | `#241C1D` | 23.5% 0.013 10 | Elevated surface, toasts |
| `ink-400` | `#2E2526` | 27.5% 0.014 10 | Inputs |
| `ink-500` | `#3D3234` | 33% 0.015 10 | Selected segment / chip |
| `ink-600` | `#504446` | 40% 0.016 10 | Strong borders |

### Text (fog scale)

| Token | Hex | On `ink-200` | Role |
|---|---|---|---|
| `fog-100` | `#F6F0F1` | 16.1:1 | Primary text |
| `fog-200` | `#DACDCF` | 11.8:1 | Secondary text |
| `fog-300` | `#B7A6A8` | 7.8:1 | Tertiary, inactive labels |
| `fog-400` | `#968486` | 5.1:1 | Metadata, counts, hints |
| `fog-500` | `#6E5F61` | 3.0:1 | Icons and placeholders only, never body text |

The old `fog-400` and `fog-500` sat at roughly 3.4:1 and 1.9:1 and were used for metadata and icons respectively.

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

Active: raised neutral, `bg-ink-500`, `text-fog-100`, `border-white/[0.16]`, the same as a chosen segment. Inactive: `bg-white/[0.04]`, `text-fog-300`, `border-white/[0.08]`.

### Segmented control (`.seg` + `.seg-item`)

Every tab bar and single-choice row (Looks Saved/History, Care Today/Calendar/Products, the season and context switches, One piece/Several). Container `bg-white/[0.05]` pill; the item carrying `aria-checked="true"` or `aria-selected="true"` becomes a raised `ink-500` pill with a faint inner top highlight. Items are 48px tall. Selection state is driven by the ARIA attribute, so a control cannot look selected without also announcing it.

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

Fixed to bottom, floating pill, `.nav-glass`.

- **Liquid glass on Chromium** (his S24). `hooks/useLiquidGlass.ts` draws a bevel normal map of the pill on a canvas, inlines it into an SVG `feDisplacementMap`, and applies it with `backdrop-filter: url(#ww-nav-glass) blur(5px) saturate(1.25) brightness(0.82)`. The map is rebuilt whenever the pill resizes, because the active label slides open and changes its width. The tint thins to `ink-100 / 0.58` so there is something to refract; the rim light stays faint and the inner glow is `accent-600`, never a white shine.
- **Frosted everywhere else** (Ishita's iPhone). Safari cannot use an SVG filter as a backdrop, so the hook is gated on a Chromium brand, not `@supports`, and Safari keeps `ink-200 / 0.92` with `blur(28px) saturate(190%)`.

Four destinations each: Today, Wardrobe, Care, Looks for him; Home, Wardrobe, Style him, Picks for her. Icon always, label only on the active tab, which slides open into it. Care's icon is `Droplets`: sparkles reads as "AI", and Care is the part of the app that deliberately does not call a model.

Active item: `bg-crimson-400`, white text. Inactive: `text-fog-300`.

### Today's fit (TodayFit + OutfitComposition)

The home screen hero, roughly two thirds of the visible screen.

- `OutfitComposition` lays items out as a flat-lay on one `.photo-well` plate: top large in band one with layers beside it, bottom and shoes in band two, accessories along band three. **No per-item borders or cards**: those are what made the old version read as a product list rather than an outfit. With `animate`, pieces settle in one after another in dressing order (`piece-in`, 60ms apart), and the plate is keyed by its item ids so a new option replays it.
- The plate sits in a `.fit-stage` lit by the outfit's `--story` colour, with the swatch line under it.
- Then one row: `Wear this` (h-14, crimson, flexible) beside `Another` (h-14, neutral). They used to be stacked, and on a 6.8in phone "Wear this" landed under the nav. A back chevron appears on the left once he has moved past the first option.
- Then the reasoning, clamped to two lines, and "Why this works" into the full sheet. Save is a bookmark icon in the section header, not a third button.
- The alternatives are real but hidden. `Another` walks the batch, then generates a fresh one when it runs out.

### Looks (LookTile + LookSheet)

A two-column grid of small flat-lays (the same `OutfitComposition`, square, not animated), each with its name, up to three colour dots, and one line of state: `Worn today`, `From Ishita`, or the season. Tapping opens `LookSheet`: the plate in its lit stage, the note or reasoning, `Wear this today`, and a quiet two-tap `Delete look`. The previous full-width cards made seventeen looks about 5,000px tall, and their button read "Wearing this", which sounds like a status.

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
- `piece-in`: translateY 10px + scale 0.97 → rest, 460ms spring, staggered 60ms per garment. A new outfit arriving.
- `--story` transition: 900ms. The outfit's light changes colour instead of snapping.
- `animate-heart-in`: the check when an outfit is marked worn.

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

## Care

Skin, hair and body. A second daily decision system, not a settings page, which is why it holds a navigation slot rather than living behind Profile.

### It does not call a model

Outfit generation earns an LLM call: the answer is open-ended and changes with 105 items, the weather and the occasion. "Cleanse, then moisturise" does not. `src/lib/care/engine.ts` is a pure function of `(profile, products, logs, context, now)` — no fetch, no randomness. AI belongs in this feature only where the question is genuinely open, like reading a new product's ingredients off a photo.

### Privacy is enforced at the database, not the UI

Every other table carries an `anon_read` policy with `using (true)`, so the publishable key in the client bundle can read it. That is a fair trade for t-shirts. It is not one for shaving, intimate grooming, skin reactions or scalp photographs — **Ishita's browser holds that same key**, and a fetch from her devtools console walks past every proxy rule and every piece of UI gating.

So the `care_*` tables have RLS enabled and **no policies at all**. Verified from her logged-in session with the key harvested out of the JS bundle:

| Table | Result |
|---|---|
| `items`, `outfits` | 200, full rows |
| `care_profile`, `care_products`, `care_logs`, `care_photos` | 401, `permission denied` |

Access is only ever the service-role client inside `/api/care`, behind an owner check, plus `proxy.ts` blocking `/care` and `/api/care` for the partner role. Three independent layers. **Do not add an anon policy to make a client-side read work.**

Sharing is opt-in and narrow: `share_with_partner` exposes the hairstyle goal and next cut date, never a routine, a log or a photo.

### Layout

Two segments, **Routine** and **Products**. GPT's sketch had Skin, Hair and Body as separate tabs; that is a filing cabinet, not a routine. Nobody does all their skin steps and then all their hair steps — they shampoo in the shower and moisturise after. The routine interleaves domains in the order they happen; domain is only a grouping where it genuinely is one, which is the product shelf.

Steps are compact rows with a 48px check circle on the right, not full-width buttons. Seven stacked crimson buttons on a wash day undid the restraint pass in one screen.

No rings, no streaks, no score. This is meant to remove thinking, not gamify washing your face.

### Grooming dates tell the truth

`lib/care/grooming.ts` is the single source for shave, trim and haircut timing, used by both the Care engine (his screen) and `/api/grooming-status` (Ishita's card).

- **Logging exists.** Every "Next up" row is a button that opens a sheet: `Done today`, `Yesterday`, or `Earlier` with a date picker (up to 120 days back). A toast confirms with `Undo`, which deletes that exact log by id. Before this, nothing in the app could record a shave, so every date froze on the 4 August seed and counted up forever.
- **Haircut milestones follow the last cut.** Edge clean-up is 16 days after any haircut, the shape cut 42 days after the last full one. Those match the old hardcoded 20 Aug and 15 Sep exactly, but now move when a cut is logged.
- **Stale is not overdue.** Past `max(2 × cadence, cadence + 7)` days with no log, a date is unknown: it shows "Last logged 4 Aug" with a neutral `Log it`, sorts after real dates, never raises a chip on Today, and is **never sent to Ishita**. Only genuinely due dates get crimson.

### Today card

One line between the context pill and the outfit: `☀ Morning care · 9 steps · 14 min` with at most one chip for an exception (`Post-shave`, `Event tomorrow`) or a genuinely due grooming date. The step names used to be listed here too; that was the card that pushed `Wear this` below the fold. Once the routine is done it collapses to "Morning care done".

The outfit stays the visual hero. `OutfitComposition` is capped at `38dvh`.

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

*Last updated: September 2026, the "Colour story" pass: OKLCH ink and fog, neutral selection, outfits lit by their own colours, photo plates, Wear this above the fold, Looks as a grid, grooming dates that can be logged and never pretend, liquid glass nav. Before that, August 2026, the "Focus" pass.*
