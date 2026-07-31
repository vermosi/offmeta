# Architecture

This page explains how OffMeta is put together: the React app, the search pipeline, the Supabase-backed data model, and the boundaries between client-side and server-side work.

## Start Here

- [docs/README.md](./README.md)
- [README.md](../README.md)

## What OffMeta Is

OffMeta is a React 19 + Vite application that turns natural-language Magic: The Gathering searches into valid Scryfall queries. The front end is responsible for the user experience, while the search pipeline and edge functions handle translation, validation, caching, and privileged work.

The important design idea is that the app is not "just a search bar." It is a layered translation system:

1. The user describes what they want in plain English.
2. Deterministic rules try to resolve the intent first.
3. The semantic-search edge function validates and repairs the query.
4. AI translation is used only when the request is novel, ambiguous, or outside the deterministic rules.
5. Scryfall returns the actual cards and metadata.

That split keeps common cases fast and predictable while leaving room for hard cases.

## Core Boundaries

- `src/` contains the client application, UI, stateful hooks, shared helpers, and local validation.
- `supabase/functions/semantic-search/` contains the translation engine that turns natural language into Scryfall syntax.
- `supabase/functions/` contains privileged backend surfaces that should not run in the browser.
- `src/lib/security/` contains reusable security utilities shared across the app and tests.

## Data Flow

1. User input enters the search UI.
2. Search state is normalized and validated on the client.
3. The semantic-search edge function applies deterministic handling first.
4. If the request needs translation, the pipeline may pre-translate into English before deterministic or AI search continues.
5. A cache lookup may satisfy the request early.
6. The AI fallback handles the remaining novel or ambiguous cases.
7. Scryfall returns cards, which the UI renders with explanation metadata.

The deterministic rule set is still written around English MTG phrasing. That means multilingual behavior depends on the pre-translation stage to bridge user locale and the rule-based search engine.

## Directory Map

- `src/components/` - UI surfaces and shared presentation pieces
- `src/hooks/` - stateful logic, search orchestration, undo/redo, and keyboard shortcuts
- `src/lib/` - shared utilities, validation, security helpers, and search primitives
- `src/pages/` - route-level screens and app entry pages
- `supabase/functions/semantic-search/` - natural-language to Scryfall translation pipeline
- `supabase/functions/` - other edge-function surfaces and privileged workflows

## Key Modules

- `src/components/UnifiedSearchBar.tsx` - main search input surface
- `src/components/ErrorBoundary.tsx` - React runtime failure protection
- `src/lib/scryfall/client.ts` - Scryfall request client
- `src/lib/i18n/` - locale and translation helpers
- `supabase/functions/semantic-search/index.ts` - edge-function entry point
- `supabase/functions/semantic-search/validation.ts` - request and output validation
- `supabase/functions/semantic-search/pipeline/` - deterministic and fallback translation stages

## Data Stores

These tables are part of the search and product infrastructure:

- `translation_logs`
- `translation_rules`
- `query_cache`
- `search_feedback`
- `user_roles`
- `saved_searches`

The important pattern is that persistent state is kept small and purposeful. Search results are not stored forever; the cache and feedback tables support quality, latency, and observability instead.

## Auth and RLS

- Tables use RLS.
- Admin work goes through guarded `SECURITY DEFINER` RPCs or edge functions.
- Networked or secret-bearing work stays in edge functions.
- The client should not be trusted with privileged operations even if the UI happens to hide them.

## Error Handling

- `src/components/ErrorBoundary.tsx` handles React runtime failures.
- The semantic-search function validates, repairs, and falls back when Scryfall rejects a query.
- The app favors graceful degradation over blank screens or hard failures.

## How To Read The Code

If you are trying to understand a feature end to end, follow this order:

1. Start with the route or component in `src/pages/` or `src/components/`.
2. Trace the hook in `src/hooks/` if the component delegates search or state management.
3. Follow the shared helper into `src/lib/`.
4. Finish in `supabase/functions/semantic-search/` if the feature depends on translation or backend validation.

That path usually makes the intent much clearer than jumping straight into the edge function.
