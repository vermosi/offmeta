# OffMeta Design System

OffMeta is a search console for Magic card discovery. The UI should feel like a focused research tool: clear, trustworthy, dense when needed, and never generic SaaS chrome.

## Core Principles

- Search is the hero. The query, results, and next action should be obvious within one screen.
- Trust before decoration. Show provenance, confidence, and refinement state plainly.
- Dense, not cramped. Favor compact information hierarchy over empty whitespace.
- Editorial restraint. Use a strong visual direction, but keep the product readable and fast.
- One primary action per surface. Secondary actions should recede.

## Visual Direction

- Use a warm, high-contrast neutral base instead of stark white.
- Use one strong accent color for primary actions and active states.
- Prefer layered surfaces and subtle borders over heavy shadows.
- Use rounded corners sparingly and consistently.
- Avoid generic purple SaaS gradients, oversized card grids, and decorative clutter.

## Typography

- Use one expressive display face for headlines and one highly readable sans for body copy.
- Query text, metadata, labels, and small UI chrome should be clearly separated by size and weight.
- Keep search terms and card data easy to scan at a glance.

## Layout

- Keep the search bar and result summary visually anchored at the top of the experience.
- Use compact panels for provenance, filters, next steps, and explanations.
- Let results breathe, but avoid huge blank bands.
- On smaller screens, stack vertically and keep the primary action visible.

## Components

- Search bar: prominent, compact, and editable in place.
- Query disclosure: shows the translated query, provenance, and confidence together.
- Result cards: data-dense with clear hierarchy, not brochure-like.
- Next actions: one clear primary recommendation and one quieter fallback.
- Empty states: useful, not cute; give the next search move immediately.

## Motion

- Keep motion subtle and purposeful.
- Use small transitions for state changes, focus, and expansion.
- Avoid playful animation that competes with reading.

## Do Not

- Do not use raw purple-accent SaaS styling.
- Do not add decorative sections that do not help the user search.
- Do not hide provenance or confidence behind extra clicks.
- Do not add new visual patterns unless they solve a clear search problem.

## Implementation Notes

- Favor Tailwind semantic tokens already used by the app.
- Keep changes small and consistent across search, results, and supporting panels.
- When in doubt, simplify the UI before adding new decoration.
