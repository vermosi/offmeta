# Follow-up work after the Discord + Combos changes

Recent work (Discord pagination, branded `/go` links, functional similarity, Find My Combos restyle) left a few loose ends. Here is what is worth closing out, in priority order.

## 1. Publish so the branded Discord links resolve

`/go` exists in the app router (`src/AppRoutes.tsx` → `src/pages/GoRedirect.tsx`) but the live site has not been published since the route was added, so every tracked Discord result link 404s in production. Publishing is the fix; nothing to code.

## 2. Bring the Discord docs up to date

`docs/discord-bot.md` still describes the original one-shot embed. It does not mention:
- Prev / Next pagination buttons, the 500-result browse ceiling, and the fact that paging reuses the already-translated query.
- The branded `offmeta.app/go` link flow, HMAC signing, 7-day link expiry, and click analytics.
- Per-user rate limiting (5 searches/min) and how paging clicks count against it.
- The `?health=1` startup check and the protected `?register=1` command-registration endpoint (the doc still tells you to register by hand via curl).
- `cards like X` routing through the card-similarity engine with functional tag fingerprinting.

## 3. Finish the i18n pass on Find My Combos

The restyled page introduced new labels with inline English fallbacks (for example `combos.eyebrow`). Add the missing keys to all 11 locale files so nothing falls back to English, and confirm the removed search bar left no orphaned keys behind.

## 4. Update the Find My Combos test

`src/pages/__tests__/FindMyCombos.test.tsx` predates the restyle and the search-bar removal. Update assertions to the current header/structure and add a case asserting the page no longer renders a search input.

## 5. Editorial shell consistency sweep

Deck Check and Combos now share the editorial shell (mono eyebrow, display h1, `max-w-4xl`, squared corners). Audit the remaining secondary routes for the same treatment and fix the outliers: `/market`, `/browse-searches`, `/about`, `/docs`, `/creators`, `/guides`.

## 6. Add a GoRedirect route test

There is no test for `src/pages/GoRedirect.tsx`. Cover the three paths: valid signature redirects, invalid signature shows the 400 message, expired link shows the 410 message.

## 7. Refresh the backlog

Log the above in `docs/autonomous-improvement-backlog.md` with priorities so the autonomous loop picks them up in order.

## Technical notes

- No schema or edge-function behaviour changes are proposed here beyond documentation; the bot code itself is deployed and working.
- Tests run with `npm run test`; i18n key additions should be verified with the existing missing-key check before shipping.
