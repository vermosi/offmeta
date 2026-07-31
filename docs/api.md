# API

This page documents the main edge functions and client-side service contracts that matter to the app. The repo keeps most privileged logic in Supabase edge functions, while the browser talks to those functions through a smaller set of validated request and response shapes.

## Shared Authentication

All edge functions are deployed under `supabase/functions/`.

Authentication is handled by the shared `_shared/auth.ts` helper, which accepts:

- the Supabase anon key
- authenticated user JWTs
- the service role key
- the `OFFMETA_API_SECRET` custom secret

That gives the app a consistent auth story across user-facing endpoints and admin or maintenance routes.

## Semantics To Keep In Mind

- Requests should be treated as contracts, not ad hoc payloads.
- Response shapes are intentionally stable so the frontend, tests, and edge functions can agree on the same expectations.
- Many endpoints are maintained as internal tools even when they are reachable from the public app.

## Edge Functions

### Semantic Search

**Endpoint**: `POST supabase/functions/semantic-search`

This is the core translation engine. It turns a natural-language Magic: The Gathering query into valid Scryfall syntax through a four-stage pipeline:

1. In-memory LRU cache for very fast repeat hits within the same function instance
2. Persistent DB cache in `query_cache` with a 48 hour TTL
3. Deterministic pattern matching for common archetypes and slang
4. AI fallback for novel or complex queries, protected by a circuit breaker

#### Request body

```json
{
  "query": "red or black creature that draws cards",
  "filters": {
    "format": "commander",
    "colorIdentity": ["R", "B"],
    "maxCmc": 4
  },
  "useCache": true,
  "cacheSalt": "debug-123",
  "debug": {
    "forceFallback": false,
    "simulateAiFailure": false,
    "usePipeline": true,
    "validateScryfall": false
  }
}
```

#### Response body

```json
{
  "success": true,
  "originalQuery": "red or black creature that draws cards",
  "scryfallQuery": "t:creature (c:r or c:b) o:\"draw\"",
  "explanation": {
    "readable": "Searching for: red or black creatures with card draw",
    "assumptions": [],
    "confidence": 0.9
  },
  "cached": false,
  "source": "deterministic",
  "responseTimeMs": 45
}
```

#### Source values

| Value | Meaning |
| --- | --- |
| `cache` | Returned from persistent DB cache |
| `deterministic` | Pattern or rules-based match, no AI used |
| `pattern_match` | Matched a seeded translation rule |
| `ai` | AI was invoked |
| `raw_syntax` | Input was already valid Scryfall syntax |

#### Headers

- Requests should include `x-session-id` for server-side per-session rate limiting.
- Responses include `x-request-id` for log correlation.

#### Shared contract helpers

The app-side semantic-search contract helpers live in [`src/lib/search/semantic-contract.ts`](../src/lib/search/semantic-contract.ts) and are covered by [`src/lib/search/__tests__/edge-contract.test.ts`](../src/lib/search/__tests__/edge-contract.test.ts). They mirror the request validation and response envelopes used by the edge function so local tests can validate shape without calling the deployed service.

#### Cache bypass

Set `useCache: false` to skip all cache layers. This is useful when you need to debug translation accuracy or confirm a pipeline change.

### Deck Categorize

**Endpoint**: `POST supabase/functions/deck-categorize`

Uses Gemini Flash to assign functional categories to a list of card names based on oracle text and commander or strategy context.

#### Request body

```json
{
  "cards": ["Sol Ring", "Swords to Plowshares", "Craterhoof Behemoth"],
  "commander": "Atraxa, Praetors' Voice",
  "format": "commander"
}
```

#### Response body

```json
{
  "success": true,
  "categories": {
    "Sol Ring": "Ramp",
    "Swords to Plowshares": "Removal",
    "Craterhoof Behemoth": "Finisher"
  }
}
```

Available categories: `Commander`, `Creatures`, `Instants`, `Sorceries`, `Artifacts`, `Enchantments`, `Planeswalkers`, `Lands`, `Ramp`, `Removal`, `Draw`, `Protection`, `Combo`, `Recursion`, `Utility`, `Finisher`, `Other`.

### Deck Suggest

**Endpoint**: `POST supabase/functions/deck-suggest`

Analyzes the current deck state and suggests high-priority cards to fill open slots, ranked by synergy with the commander and the overall strategy.

#### Request body

```json
{
  "commander": "Atraxa, Praetors' Voice",
  "cards": ["Sol Ring", "Command Tower"],
  "format": "commander"
}
```

#### Response body

```json
{
  "success": true,
  "suggestions": [
    {
      "card_name": "Doubling Season",
      "reason": "Doubles counters placed by Atraxa's proliferate triggers",
      "category": "Combo",
      "priority": "high"
    }
  ],
  "analysis": "Your deck is light on counter synergies..."
}
```

### Combo Search

**Endpoint**: `POST supabase/functions/combo-search`

Proxies requests to the Commander Spellbook API to find combos. It supports both commander lookup and full deck analysis.

#### Request body, commander mode

```json
{
  "commanderName": "Thassa's Oracle"
}
```

#### Request body, deck mode

```json
{
  "action": "deck",
  "commanders": ["Thassa's Oracle"],
  "cards": ["Demonic Consultation", "Tainted Pact", "..."]
}
```

#### Response body, deck mode

```json
{
  "success": true,
  "included": [],
  "almostIncluded": []
}
```

`included` means all combo cards are present in the deck. `almostIncluded` means the combo is missing one or two cards.

### Deck Recommendations

**Endpoint**: `POST supabase/functions/deck-recommendations`

Uses Gemini Flash to analyze a full decklist and generate categorized improvement suggestions.

#### Request body

```json
{
  "commander": "Atraxa, Praetors' Voice",
  "decklist": ["Sol Ring", "Command Tower", "..."],
  "budget": "medium"
}
```

#### Response body

Returns categorized recommendations in groups such as High Synergy, Upgrades, Budget Picks, and Sideboard. Each entry includes `card_name`, `reason`, and `category`.

### Fetch Moxfield Deck

**Endpoint**: `POST supabase/functions/fetch-moxfield-deck`

Proxies Moxfield API requests to extract decklists from Moxfield URLs and bypass browser CORS restrictions.

#### Request body

```json
{
  "url": "https://www.moxfield.com/decks/abc123"
}
```

#### Response body

Returns the deck's commander name and the `cards` array with card names and quantities.

### Admin Analytics

**Endpoint**: `GET supabase/functions/admin-analytics?days=7`

Returns aggregated search analytics. This endpoint requires admin role, which means the JWT must belong to a user with `admin` in `user_roles`.

The response includes summary stats, daily volume, source breakdown, confidence buckets, response percentiles, popular queries, low-confidence queries, and deterministic coverage trends.

### Search Quality Repair

**Endpoint**: `GET supabase/functions/admin-search-quality-repair?days=7`

Returns ranked repair candidates for the admin analytics workflow. This endpoint requires admin role.

Each row includes quality score, no-result counts, refinement counts, confidence, sample size, and flags for existing or active translation rules.

**Endpoint**: `GET supabase/functions/admin-search-quality-repair?query=<normalized_query>&days=7`

Returns a query detail payload with analytics, feedback, existing translation rules, and recent outcomes for one query.

**Endpoint**: `POST supabase/functions/admin-search-quality-repair`

Creates or updates a `translation_rules` row through the admin-safe service-role path.

## Client-Side Scryfall

The frontend Scryfall client in [`src/lib/scryfall/client.ts`](../src/lib/scryfall/client.ts) automatically appends `-is:rebalanced` to queries so Alchemy rebalanced cards stay out of normal results.

### Printings

[`src/lib/scryfall/printings.ts`](../src/lib/scryfall/printings.ts) fetches all printings for a card name, sorted by release date. It is used by the `PrintingPickerPopover` in the deck editor and cached module-level for the lifetime of the session.

### Collection price lookup

[`src/hooks/useDeckPrice.ts`](../src/hooks/useDeckPrice.ts) batches up to 75 card names per request against the Scryfall `/cards/collection` endpoint to compute total mainboard USD value. It reuses the shared Scryfall ref cache so already-fetched cards do not cost extra requests.
