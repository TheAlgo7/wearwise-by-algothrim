# Product

## Register

product

## Users

Single user: Gaurav Kumar (The Algothrim). Primary device: Samsung Galaxy S24 Ultra. Uses this app standing in front of the wardrobe in the morning, occasionally mid-day when plans change. Not browsing for inspiration — making a decision under low cognitive load, sometimes time pressure. The interface needs to hand him a complete, confident recommendation and get out of the way.

## Product Purpose

WearWise is a personal AI wardrobe OS. It catalogs every piece Gaurav owns, learns his style blueprint (fits, palette, signature combos, rules), and generates complete outfit recommendations calibrated to context: time of day, occasion mode, weather layer, trip destination. It also tracks wear history so nothing gets overused and forgotten pieces surface again. Success looks like: opening the app, tapping Generate, and trusting the result without second-guessing it.

## Brand Personality

Composed. Decisive. Yours.

The app speaks with the confidence of a personal stylist who already knows your wardrobe better than you do. Not playful, not corporate. It doesn't explain itself — it recommends. Every word is load-bearing; nothing reassures or apologizes.

Since the November 2026 revamp ("Lights down", see `docs/revamp-brief.md`) the look is its own: a wardrobe after dark. True black, his garments floating with no plates, each outfit lit by its own colour and drawn head to toe at true proportion. The native One UI look it used to mirror is what he called outdated and boring.

## Anti-references

- Generic AI fashion apps (Stylebook, Cladwell) — pastel, neutral, lifestyle-magazine softness. WearWise is a tool, not a mood board.
- SaaS dashboards with metric cards and gradient CTAs. This is not productivity software.
- Streetwear hype apps with neon on black and aggressive typography. The user's style is clean and composed, not maximalist.
- Light mode anything. A person choosing an outfit in a dim bedroom at 7am does not want a white screen.

## Design Principles

1. **Decide, don't defer.** The app makes the call. Options exist to refine, not to hedge. Never show "here are some ideas" — show the recommendation and let the user push back.
2. **Native in the hand, its own in the eye.** Touch targets, gestures, sheets and the system font for every label behave like his phone. The look does not imitate One UI: true black, floating garments, outfits lit by their colour, one display face for moments.
3. **Dark by necessity.** The dark theme isn't aesthetic posturing — it's the right choice for the physical scene: dim bedroom, morning, phone in hand. Every color decision flows from that.
4. **Quiet chrome, loud clothes.** The interface stays black, bone and restrained so the clothes carry the colour. Anything decorative that doesn't carry information gets cut; the outfit's light is information (its colour story).
5. **Crimson is the voice.** The accent color is not decoration — it marks everything that matters: active states, primary actions, AI-generated content. It should feel earned, not scattered.

## Accessibility & Inclusion

WCAG 2.1 AA. Single user — no i18n required. No `prefers-reduced-motion` override: he runs reduce-motion on at the OS level and still wants the app's motion (all of it short, opacity and transform only, never looping). Touch targets 44px minimum. Focus rings visible on all interactive elements for keyboard/switch access.
