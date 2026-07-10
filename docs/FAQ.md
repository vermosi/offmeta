# FAQ

## Why are results empty or unexpected?

- Verify your query includes enough constraints (type, color, format).
- Check the `Search Interpretation` panel to confirm the Scryfall syntax.
- Try a simpler query, then add filters incrementally.

## Why is my query too broad?

The Edge Function applies a deterministic pass first, then falls back to AI for residual queries. Overly broad intent can still return many results. Add type/color/format hints to narrow the search.

## Why does it say "AI unavailable"?

The system falls back to deterministic rules if the AI gateway is unavailable. You can still search, but results may be less precise for complex queries.

## How do I report incorrect translations?

Use the "Report Issue" or feedback dialogs in the UI to submit corrections. Feedback is stored in the `search_feedback` table and can be used to generate new translation rules.

## Can I search in languages other than English?

Yes. OffMeta supports 11 languages (en, es, fr, de, it, pt, ja, ko, ru, zhs, zht). Non-English queries are automatically pre-translated to English before being processed by the Scryfall translation pipeline. This helps preserve intent across locales.

## What is the translation pipeline architecture?

1. **Deterministic pass** — Pattern matching for colors, types, formats, keywords, slang
2. **Slot extraction** — Structured constraints (colors, types, mana value, price, rarity)
3. **Pre-translation** — Non-English queries translated to English via `gemini-2.5-flash-lite`
4. **AI translation** — Residual natural language → Scryfall syntax via `gemini-3-flash-preview`
5. **Validation & repair** — Query sanitization, auto-correction, conflict detection
6. **Scryfall validation** — Optional live validation against Scryfall API

## What Scryfall syntax does OffMeta use?

OffMeta prefers `otag:` (Oracle Tags) for effect-based searches where available, and falls back to oracle text searches when a tag is not available. It uses `mv` (mana value) instead of the deprecated `cmc`. ETB effects are translated using the canonical oracle phrase rather than a shortened placeholder.

## How does the feedback loop work?

When you submit a correction via "Report Issue", it is stored as a `pending` feedback entry. The `process-feedback` backend function immediately analyzes it using AI (Gemini 2.5 Flash Lite) and, if the translation can be improved, generates a new `translation_rules` entry linked to your submission. Future identical searches will match the rule directly without going through AI at all.

The nightly `generate-patterns` job additionally promotes repeated queries that meet the configured frequency and confidence thresholds into a permanent rule. Admins can review, approve, or reject generated rules from the analytics dashboard's Feedback Queue panel.

## How can I approve or reject AI-generated rules?

Admins can visit the Admin Analytics page and use the Feedback Queue panel. Each feedback row shows its pipeline status and the AI-generated rule (pattern, Scryfall syntax, confidence). Clicking the approve/reject toggle immediately updates the rule's active state — approved rules are used by the translation pipeline; rejected rules are disabled but kept for audit purposes.
