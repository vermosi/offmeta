# Architecture

## Overview

OffMeta is a React + Vite frontend that sends natural-language search queries to Supabase Edge Functions. The Edge Function translates user input into Scryfall syntax and returns results for display in the UI.

## High-level flow

1. **User input** (text or voice) is collected in `src/components/UnifiedSearchBar.tsx`.
2. **Supabase Edge Function** (`supabase/functions/semantic-search`) transforms the query into deterministic Scryfall syntax, optionally using AI.
3. **Scryfall API** is queried via the frontend client in `src/lib/scryfall.ts`.
4. **Results** render in the card grid and modal components.

## Key modules

- **UI**: `src/components`, `src/pages`
- **Search pipeline**: `supabase/functions/semantic-search`
- **Scryfall client**: `src/lib/scryfall.ts`
- **Supabase client**: `src/integrations/supabase/client.ts`

## Data stores

- Supabase tables: `translation_rules`, `translation_logs`, `query_cache`, `search_feedback`, `analytics_events`.

## Error handling

- `src/components/ErrorBoundary.tsx` provides a user-friendly fallback for React runtime errors.
- Edge functions return JSON error payloads with appropriate HTTP status codes.
