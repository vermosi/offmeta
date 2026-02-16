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

Yes. OffMeta supports 11 languages (en, es, fr, de, it, pt, ja, ko, ru, zhs, zht). Non-English queries are automatically pre-translated to English using a lightweight AI model before being processed by the Scryfall translation pipeline. This ensures intent preservation (e.g., "counter" in Spanish/Portuguese queries).

## What is the translation pipeline architecture?

1. **Deterministic pass** — Pattern matching for colors, types, formats, keywords, slang
2. **Slot extraction** — Structured constraints (colors, types, mana value, price, rarity)
3. **Pre-translation** — Non-English queries translated to English via `gemini-2.5-flash-lite`
4. **AI translation** — Residual natural language → Scryfall syntax via `gemini-3-flash-preview`
5. **Validation & repair** — Query sanitization, auto-correction, conflict detection
6. **Scryfall validation** — Optional live validation against Scryfall API

## What Scryfall syntax does OffMeta use?

OffMeta prefers `otag:` (Oracle Tags) for effect-based searches (e.g., `otag:card-draw`, `otag:removal`, `otag:counterspell`) as they are more accurate than raw oracle text searches. It uses `mv` (mana value) instead of the deprecated `cmc`. ETB effects use `o:"enters"` (short form) rather than the full phrase.
