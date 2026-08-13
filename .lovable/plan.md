# Homepage Redesign — "Cinematic Neon Search"

Rebuild the OffMeta homepage around the approved direction: a near-black editorial surface with ambient mana-colored light, oversized Archivo Black headlines paired with an italic Fraunces accent line, monospace technical labels, and one dominant search field that visitors can type into immediately.

## What changes visually

**Hero band**
- Oversized headline: "Manifest the" in heavy uppercase Archivo, then "perfect draw." in italic Fraunces with a light-to-dim gradient fill.
- Right-hand support paragraph explaining the product in one sentence ("Search Magic by intent, not Scryfall syntax").
- The live search field moves into the hero as the dominant object: full-width, tall, thin-bordered, glass surface, with a solid contrasting "Scry" submit button. Typing works immediately — the current "Start searching" CTA and the scroll-jump behavior are removed.
- A five-dot / five-bar mana accent (white, blue, black, red, green) sits above the field and in the status strip.
- Suggested queries render as monospace underlined links beneath the field instead of the current pill cloud.

**Status strip**
- A thin monospace header row above the hero showing product framing (index size, live status) — replaces the current generic "AI-powered MTG discovery engine" badge.

**Ambient background**
- Fixed, low-opacity blurred color fields in the five mana colors behind everything, so the page reads cinematic rather than flat.

**Feature band**
- The three existing value props ("Type the job / See the query / Keep refining") are restyled as squared, hairline-bordered panels with a short colored rule above each title and gradient-to-transparent fills. No rounded card look.

**Following bands**
- Quick paths, Scryfall comparison, related searches, and FAQ keep their content and SEO text but adopt the same hairline-border, monospace-label, full-width-band treatment so the page reads as one system.

## Technical notes

- Palette and typography are added as semantic tokens in `src/index.css` and `tailwind.config.ts` — background/surface/border/foreground plus the five mana accents. No hardcoded color utilities in components.
- Fonts: Archivo (display), Fraunces (italic accent), Inter (body), JetBrains Mono (labels), loaded non-blocking in `index.html` alongside the existing font strategy.
- `src/components/HeroSection.tsx` is rewritten to own the headline, status strip, ambient layer, and the live search field. `PageSearchBar` is composed into the hero rather than sitting in a separate band.
- `src/pages/SearchExperience.tsx` band ordering and conditional results-mode rendering are updated; the single `<h1>` stays in the hero and results mode continues to swap it, preserving the existing SEO fix.
- `HowItWorksSection`, `HomepageQuickPaths`, `ScryfallComparison`, `RelatedSearchesSection`, and `FAQSection` get styling-only updates — no copy or structural SEO changes beyond the hero headline.
- The homepage tour anchors are repointed to the new hero search element so the guided tour keeps working.
- Reduced-motion preference continues to disable the ambient/reveal animations via the existing `usePrefersReducedMotion` hook.
- Verified on desktop and mobile viewports with a browser pass after implementation.

## Out of scope

Nav structure, search behavior, card results rendering, and all backend/pipeline code stay unchanged.
