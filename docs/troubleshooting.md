# Troubleshooting

This page collects the common questions and recovery paths people hit while using or editing OffMeta.

## Empty Or Unexpected Results

- Verify the query includes enough constraints such as type, color, and format.
- Check the search interpretation panel to confirm the Scryfall syntax.
- Try a simpler query first, then add filters incrementally.

## Broad Queries

The edge function applies a deterministic pass first, then falls back to AI for residual queries. Overly broad intent can still return many results. Add type, color, or format hints to narrow the search.

## AI Unavailable

The system falls back to deterministic rules if the AI gateway is unavailable. You can still search, but results may be less precise for complex queries.

## Report Incorrect Translations

Use the Report Issue or feedback dialogs in the UI to submit corrections. Feedback is stored in the `search_feedback` table and can be used to generate new translation rules.

## Languages

OffMeta supports 11 languages: `en`, `es`, `fr`, `de`, `it`, `pt`, `ja`, `ko`, `ru`, `zhs`, and `zht`.

The interface can be localized, but the deterministic search layer is still English-centric. Non-English queries are translated to English before they reach the Scryfall translation pipeline.

## Translation Pipeline

1. Deterministic pass for colors, types, formats, keywords, and slang
2. Slot extraction for structured constraints such as colors, types, mana value, price, and rarity
3. Pre-translation for non-English queries
4. AI translation for residual natural language
5. Validation and repair for sanitization, auto-correction, and conflict detection
6. Optional Scryfall validation against the live API

## Scryfall Syntax

OffMeta prefers `otag:` for effect-based searches where available, and falls back to oracle text searches when a tag is not available. It uses `mv` instead of the deprecated `cmc`.

## Feedback Loop

When you submit a correction via Report Issue, it is stored as a `pending` feedback entry. The `process-feedback` backend function analyzes it using AI and, if the translation can be improved, generates a new `translation_rules` entry linked to your submission. Future identical searches will match the rule directly without going through AI.

The nightly `generate-patterns` job also promotes repeated queries that meet the configured frequency and confidence thresholds into a permanent rule. Admins can review, approve, or reject generated rules from the analytics dashboard's Feedback Queue panel.

Failed feedback is retried up to three times. Items that still fail after the cap are archived so they remain auditable without blocking the actionable queue.

## Approve Or Reject Rules

Admins can visit the Admin Analytics page and use the Feedback Queue panel. Each feedback row shows its pipeline status and the AI-generated rule. Clicking the approve or reject toggle immediately updates the rule's active state: approved rules are used by the translation pipeline, while rejected rules are disabled but kept for audit purposes.
