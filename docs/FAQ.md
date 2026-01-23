# FAQ

## Why are results empty or unexpected?

- Verify your query includes enough constraints (type, color, format).
- Check the `Search Interpretation` panel to confirm the Scryfall syntax.
- Try a simpler query, then add filters incrementally.

## Why is my query too broad?

The Edge Function applies a deterministic pass, but overly broad intent can still return many results. Add type/color/format hints to narrow the search.

## Why does it say "AI unavailable"?

The system falls back to deterministic rules if the AI gateway is unavailable. You can still search, but results may be less precise.

## How do I report incorrect translations?

Use the "Report Issue" or feedback dialogs in the UI to submit corrections.
