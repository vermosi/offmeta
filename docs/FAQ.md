# FAQ

This page answers the recurring questions people hit while using or editing OffMeta.

## Why are results empty or unexpected?

- Verify your query includes enough constraints such as type, color, and format.
- Check the Search Interpretation panel to confirm the Scryfall syntax.
- Try a simpler query first, then add filters incrementally.

## Why is my query too broad?

The edge function applies a deterministic pass first, then falls back to AI for residual queries. Overly broad intent can still return many results. Add type, color, or format hints to narrow the search.

## Why does it say "AI unavailable"?

The system falls back to deterministic rules if the AI gateway is unavailable. You can still search, but results may be less precise for complex queries.

## How do I report incorrect translations?

Use the Report Issue or feedback dialogs in the UI to submit corrections. Feedback is stored in the `search_feedback` table and can be used to generate new translation rules.

## Can I search in languages other than English?

Yes. OffMeta supports 11 languages: `en`, `es`, `fr`, `de`, `it`, `pt`, `ja`, `ko`, `ru`, `zhs`, and `zht`.

The interface can be localized, but the deterministic search layer is still English-centric. Non-English queries are translated to English before they reach the Scryfall translation pipeline.

What that means in practice:

- Straightforward MTG phrases often work after pre-translation.
- Idiomatic or region-specific phrasing may still need the fallback AI translation path.
- The best results still come from MTG terms that map cleanly to colors, types, formats, keywords, or common archetypes.

## What is the translation pipeline architecture?

1. Deterministic pass for colors, types, formats, keywords, and slang
2. Slot extraction for structured constraints such as colors, types, mana value, price, and rarity
3. Pre-translation for non-English queries
4. AI translation for residual natural language
5. Validation and repair for sanitization, auto-correction, and conflict detection
6. Optional Scryfall validation against the live API

The deterministic parser still assumes English phrasing for its rule set. Pre-translation exists to keep multilingual input usable while preserving a rule-based path for the most common English MTG phrases.

## What Scryfall syntax does OffMeta use?

OffMeta prefers `otag:` for effect-based searches where available, and falls back to oracle text searches when a tag is not available. It uses `mv` instead of the deprecated `cmc`. ETB effects are translated using the canonical oracle phrase rather than a shortened placeholder.

## How does the feedback loop work?

When you submit a correction via Report Issue, it is stored as a `pending` feedback entry. The `process-feedback` backend function analyzes it using AI and, if the translation can be improved, generates a new `translation_rules` entry linked to your submission. Future identical searches will match the rule directly without going through AI.

The nightly `generate-patterns` job also promotes repeated queries that meet the configured frequency and confidence thresholds into a permanent rule. Admins can review, approve, or reject generated rules from the analytics dashboard's Feedback Queue panel.

## How can I approve or reject AI-generated rules?

Admins can visit the Admin Analytics page and use the Feedback Queue panel. Each feedback row shows its pipeline status and the AI-generated rule. Clicking the approve or reject toggle immediately updates the rule's active state: approved rules are used by the translation pipeline, while rejected rules are disabled but kept for audit purposes.
