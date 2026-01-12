# Architecture

## Overview
OffMeta is a Vite + React frontend backed by Supabase Edge Functions that translate natural-language queries into Scryfall syntax. The frontend requests translations, runs the final Scryfall queries, and renders card results.

## Key components
- **Frontend**: `src/` (React, TypeScript, Tailwind, shadcn/ui)
- **Translation service**: `supabase/functions/semantic-search` (deterministic rules + AI fallback)
- **Caching & analytics**: Supabase tables (`query_cache`, `translation_logs`, `analytics_events`)
- **External APIs**: Scryfall (card data)

## Request flow
1. User submits query in `UnifiedSearchBar`.
2. The Edge Function translates the query (cache → pattern → AI fallback).
3. The frontend calls Scryfall with the translated query.
4. Results are rendered and cached client-side.

## Reliability features
- Rate limiting and in-memory caches in Edge Functions.
- Client-side timeouts and backend retry logic for Scryfall calls.
- Validation and sanitization of generated Scryfall syntax.
