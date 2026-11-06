# Revamp brief: "Lights down" (November 2026)

Gaurav asked for a deep revamp on 6 Nov 2026 ("outdated and boring") and delegated the direction ("your call and start building now"). This brief is what every screen of WearWise, WearWise Go and the WearWise demo is rebuilt against.

## What was wrong

- Every surface was the same dark rounded box: pills, cards, tiles, search, buttons. Nothing had more weight than anything else.
- The hero (today's outfit) was cut-outs in leftover boxes at random scale: trousers smaller than the boot, belt and watch as specks. The crimson "Wear this" pill was louder than the outfit.
- Garment photos sat on lighter grey plates (`.photo-well`), so the wardrobe read as a product catalogue.
- One flat system type ramp: it looked like a settings app with clothes in it.
- The production icon (hanger + sparkle) dissolves into noise at launcher size.

## Direction

**A wardrobe after dark.** True black canvas, so his photographed garments (all shot on black) float with no boxes at all. Each outfit is lit by its own colour. The outfit is drawn head to toe at true proportion, because proportion is the point of his style (boxy top over a bootcut with a long hem).

- **Scene:** a dim bedroom at 7am, or planning tomorrow at night; S24 Ultra AMOLED at low brightness, one hand, under a minute. Ishita browses in the evening on her iPhone. Dark is forced.
- **Colour strategy:** restrained chrome (black, bone text, crimson only for actions and the active tab), committed colour from the clothes (the outfit's hero colour lights the stage). The brand colour never competes with the outfit.
- **Anchors:** a menswear shop window at night (garments on black under one warm light); Apple TV and Fitness dark content UIs (content first, big confident type); his own Algothrim portfolio cards (rim light, accent light, cinematic).
- **Type:** two families. Archivo (variable, slightly expanded, semibold) for moments only: greetings, page titles, the look's colour headline, big counts. The system stack (SamsungOne on his phone, SF on hers) for every label, button and body line.
- **Mark:** the new folded two-tone W replaces the hanger icon everywhere.

## Rules every screen follows

1. No photo plates. Garment photos are `screen`-blended (`.garment`) so their black dissolves into the canvas or into the light behind them. Overlapping margins never show; garment-on-garment overlap is avoided by geometry.
2. One outfit layout everywhere (`OutfitComposition`): top over bottom on one axis at true scale, finishing pieces (cap, glasses, under-layer, watch, belt, shoes) in a side column, head items at the top, shoes at the hem.
3. The light lives inside the figure (container queries make the figure a stacking context, so a light outside it would not blend).
4. Cards only where grouping is real (a sheet, a form). Lists are rows with hairlines, not boxes.
5. Crimson is spent on doing something: Wear this, Done today, the add button, the active tab, Ishita's signal, genuinely due dates.
6. Motion states change, never decorates: pieces arrive in dressing order, the light cross-fades between outfits, swipe moves between options.
7. His standing rules: no em dashes, no eyebrow kickers, no accent top borders, no reduced-motion kill switch, liquid glass only on the nav dock and sheets.

## Build order

1. Foundation: type, tokens, garment blending, icon set. Today. Wardrobe. (6 Nov)
2. Looks, item page, Care, profile, unlock.
3. Ishita's side (home, Style him, picks), checked on WebKit at 393x852.
4. WearWise Go and the demo onto the same system.

The branch is `revamp`; production stays on `main` until he has seen it on his phone.
