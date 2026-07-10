# Architecture

This page is the compact index for the app and edge-function architecture.

## Start here

- [docs/README.md](./README.md)
- [README.md](../README.md)

## Core sections

- [Overview](#overview)
- [Data flow](#data-flow)
- [Directory map](#directory-map)
- [Key modules](#key-modules)
- [Data stores](#data-stores)
- [Auth and RLS](#auth-and-rls)
- [Error handling](#error-handling)

## Overview

OffMeta is a React 19 + Vite app that translates natural-language Magic: The Gathering searches into Scryfall syntax, then queries Scryfall and renders results.

## Data flow

1. User input enters the search UI.
2. The semantic-search edge function applies deterministic rules first.
3. AI translation is used only as fallback.
4. Scryfall returns cards, which the UI renders.

## Directory map

- `src/components/` - UI surfaces
- `src/hooks/` - stateful logic and search flow
- `src/lib/` - shared utilities and validation
- `supabase/functions/semantic-search/` - NL to Scryfall pipeline
- `supabase/functions/` - other edge-function surfaces

## Key modules

- `src/components/UnifiedSearchBar.tsx`
- `src/lib/scryfall/client.ts`
- `src/lib/i18n/`
- `supabase/functions/semantic-search/index.ts`
- `supabase/functions/semantic-search/validation.ts`
- `supabase/functions/semantic-search/pipeline/`

## Data stores

- `translation_logs`
- `translation_rules`
- `query_cache`
- `search_feedback`
- `user_roles`
- `saved_searches`

## Auth and RLS

- Tables use RLS.
- Admin work goes through guarded `SECURITY DEFINER` RPCs or edge functions.
- Networked or secret-bearing work stays in edge functions.

## Error handling

- `src/components/ErrorBoundary.tsx` handles React runtime failures.
- The semantic-search function validates, repairs, and falls back when Scryfall rejects a query.
