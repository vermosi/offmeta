# API

All edge functions are deployed to `supabase/functions/`. Authentication is handled by the shared `_shared/auth.ts` helper, which accepts the Supabase anon key, authenticated user JWTs, the service role key, or the `OFFMETA_API_SECRET` custom secret.

---

## Edge Functions

### Semantic Search

**Endpoint**: `POST supabase/functions/semantic-search`

Translates a natural-language Magic: The Gathering query into valid Scryfall syntax via a 4-layer pipeline:

1. **In-memory LRU cache** — sub-millisecond repeat hits within the same function instance
2. **Persistent DB cache** (`query_cache` table, 48h TTL) — shared across instances
3. **Deterministic / pattern match** — rule-based translation for common archetypes and slang
4. **AI fallback** — Gemini Flash for novel/complex queries (circuit-breaker protected)

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

#### Response body (success)

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

#### `source` values

| Value | Meaning |
|-------|---------|
| `cache` | Returned from persistent DB cache |
| `deterministic` | Pattern/rules-based match, no AI used |
| `pattern_match` | Matched a seeded translation rule |
| `ai` | AI (Gemini Flash) was invoked |
| `raw_syntax` | Input was already valid Scryfall syntax |

#### Headers

- Requests should include `x-session-id` for server-side per-session rate limiting.
- Responses include `x-request-id` for log correlation.

#### Cache bypass

Set `useCache: false` in the request body to skip all cache layers. Useful for debugging translation accuracy.

---

### Deck Categorize

**Endpoint**: `POST supabase/functions/deck-categorize`

Uses Gemini Flash to assign functional categories to a list of card names based on their oracle text and the deck's commander/strategy context. Returns a map of `card_name → category`.

#### Request body

```json
{
  "cards": ["Sol Ring", "Swords to Plowshares", "Craterhoof Behemoth"],
  "commander": "Atraxa, Praetors' Voice",
  "format": "commander"
}
```

#### Response body (success)

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

---

### Deck Suggest

**Endpoint**: `POST supabase/functions/deck-suggest`

Analyzes the current deck state and suggests high-priority cards to fill open slots, ranked by synergy with the commander and overall strategy.

#### Request body

```json
{
  "commander": "Atraxa, Praetors' Voice",
  "cards": ["Sol Ring", "Command Tower"],
  "format": "commander"
}
```

#### Response body (success)

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

---

### Combo Search

**Endpoint**: `POST supabase/functions/combo-search`

Proxies requests to the Commander Spellbook API to find combos. Supports both commander lookup and full deck analysis.

#### Request body (commander mode)

```json
{
  "commanderName": "Thassa's Oracle"
}
```

#### Request body (deck mode)

```json
{
  "action": "deck",
  "commanders": ["Thassa's Oracle"],
  "cards": ["Demonic Consultation", "Tainted Pact", "..."]
}
```

#### Response body (deck mode)

```json
{
  "success": true,
  "included": [...],
  "almostIncluded": [...]
}
```

`included` = combos where all cards are present in the deck.  
`almostIncluded` = combos missing 1–2 cards (shown as "Almost There").

---

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

#### Response body (success)

Returns categorized recommendations: **High Synergy**, **Upgrades**, and **Budget Picks**, each with `card_name`, `reason`, and `category`.

---

### Fetch Moxfield Deck

**Endpoint**: `POST supabase/functions/fetch-moxfield-deck`

Proxies Moxfield API requests to extract decklists from Moxfield URLs, bypassing browser CORS restrictions.

#### Request body

```json
{
  "url": "https://www.moxfield.com/decks/abc123"
}
```

#### Response body (success)

Returns the deck's `commander` name and `cards` array (name + quantity) extracted from the Moxfield API.

---

### Admin Analytics

**Endpoint**: `GET supabase/functions/admin-analytics?days=7`

Returns aggregated search analytics. **Requires admin role** (JWT must belong to a user with `admin` in `user_roles`).

Returns: summary stats, daily volume, source breakdown, confidence buckets, response percentiles, popular queries, low-confidence queries, and deterministic coverage trend.

---

### Process Feedback

**Endpoint**: `POST supabase/functions/process-feedback`

Processes a pending `search_feedback` row: validates the issue, uses Gemini 2.5 Flash Lite to generate a corrected Scryfall query, optionally inserts a new `translation_rules` entry, and updates the feedback row's `processing_status`.

**Auth**: `verify_jwt = false` — accepts requests without a JWT (anon callers can submit corrections).

**Rate limit**: 5 requests per 60 seconds per session.

#### Request body

```json
{ "feedbackId": "uuid-of-the-search_feedback-row" }
```

#### Response body (success)

```json
{
  "success": true,
  "status": "completed",
  "ruleId": "uuid-of-created-translation_rules-row"
}
```

#### `status` values

| Value | Meaning |
|---|---|
| `completed` | AI generated a new rule; rule inserted and linked to the feedback row |
| `updated_existing` | Pattern already existed; existing rule confidence updated |
| `duplicate` | Feedback query identical to an existing rule; no write performed |
| `skipped` | AI returned a low-confidence or empty result; no rule created |
| `failed` | Unrecoverable error (timeout, AI error); feedback row marked `failed` |

> A 25-second safety timeout resets any feedback row still in `processing` state to `failed` on the next invocation, preventing permanently stuck rows.

---

### Generate Patterns

**Endpoint**: `POST supabase/functions/generate-patterns`

Scans `translation_logs` for the last 30 days and batch-promotes high-frequency, high-confidence queries into `translation_rules`. Triggered nightly by the `generate-patterns-nightly` pg_cron job at 03:00 UTC.

**Auth**: Anon JWT (Bearer token) accepted by `validateAuth`. `verify_jwt` is not set to `false` — the anon JWT passes the standard validator.

#### Request body

```json
{ "source": "cron" }
```

`source` is optional and used only for log tracing. Omitting it is valid.

#### Response body (success)

```json
{
  "success": true,
  "patternsCreated": 3,
  "analyzed": 120,
  "timeMs": 450
}
```

| Field | Description |
|---|---|
| `patternsCreated` | Number of new `translation_rules` rows inserted |
| `analyzed` | Number of candidate log entries examined |
| `timeMs` | Total wall-clock time for the run |

#### Promotion criteria

A log entry is promoted to a rule when **all** of the following hold:

- Seen ≥ 2 times in the last 30 days (lowered from 3 to catch faster-rising patterns)
- Average confidence ≥ 0.8
- Returned ≥ 1 Scryfall result across all occurrences (guards against zero-result noise)
- No existing `translation_rules` row matches the normalized query form

Up to 50 rules are inserted per run. Once promoted, those patterns are picked up by `fetchDynamicRules()` in `semantic-search/rules.ts` within its 10-minute TTL cache, after which identical queries resolve without any AI call.

---

### Spicerack Import

**Endpoint**: `POST supabase/functions/spicerack-import`

Fetches tournament decklists from the Spicerack API and stores them in `community_decks`. Resolves Moxfield deck URLs via the Moxfield API and batch-resolves card oracle IDs via Scryfall.

**Auth**: Anon JWT accepted. Requires `SPICERACK_API_KEY` secret to be configured.

#### Request body

```json
{
  "num_days": 7,
  "event_format": "MODERN"
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `num_days` | number | `14` | Number of days of tournament data to fetch |
| `event_format` | string | `null` | Optional filter: `STANDARD`, `MODERN`, `PIONEER`, `LEGACY`, `VINTAGE`, `COMMANDER2`, `PAUPER`, `HISTORIC`, `EXPLORER`, `TIMELESS`, `DUEL`, `OATHBREAKER`, `PREMODERN`, `GLADIATOR`, `STANDARD_BRAWL`, `PREDH` |

#### Response body (success)

```json
{
  "success": true,
  "imported": 42,
  "skipped": 108,
  "tournaments": 12
}
```

| Field | Description |
|-------|-------------|
| `imported` | Number of new decks inserted |
| `skipped` | Decks skipped (already imported or empty decklist) |
| `tournaments` | Number of tournaments processed |

#### Cron schedule

Runs daily at **06:00 UTC** via `pg_cron` job `spicerack-import-daily` with `{"num_days": 1}` to fetch the previous day's tournaments.

---

### Card Sync

**Endpoint**: `POST supabase/functions/card-sync`

Populates the `cards` table with Scryfall metadata for all unique oracle IDs found in `community_deck_cards` that don't yet have entries.

**Auth**: Anon JWT accepted.

#### Request body

```json
{}
```

No parameters required.

#### Response body (success)

```json
{
  "success": true,
  "synced": 150,
  "total": 200
}
```

#### Cron schedule

Runs daily at **07:00 UTC** via `pg_cron` job `card-sync-daily`.

---

### Compute Cooccurrence

**Endpoint**: `POST supabase/functions/compute-cooccurrence`

Computes card co-occurrence statistics from `community_decks` and stores pairwise relationships in `card_cooccurrence` for the recommendation engine.

**Auth**: Anon JWT accepted.

#### Request body

```json
{
  "format": "all",
  "full_rebuild": false
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `format` | string | `"all"` | Format to compute cooccurrence for (or `"all"`) |
| `full_rebuild` | boolean | `false` | If true, deletes existing cooccurrence data for the format before computing |

#### Response body (success)

```json
{
  "success": true,
  "decksProcessed": 500,
  "upserted": 12500,
  "format": "all"
}
```

#### Cron schedule

Runs daily at **08:00 UTC** via `pg_cron` job `compute-cooccurrence-daily`.

---

### Deck Critique

**Endpoint**: `POST supabase/functions/deck-critique`

AI-powered deck analysis that suggests cuts and additions with reasoning. Uses Gemini 3 Flash with structured tool output.

**Auth**: Anon JWT accepted.

**Rate limit**: 5 requests per 200 seconds per IP.

#### Request body

```json
{
  "commander": "Atraxa, Praetors' Voice",
  "cards": [
    { "name": "Sol Ring", "category": "Ramp", "quantity": 1 },
    { "name": "Command Tower", "category": "Lands", "quantity": 1 }
  ],
  "color_identity": ["W", "U", "B", "G"],
  "format": "commander"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `commander` | string | No | Commander name for context |
| `cards` | array | Yes | Array of card objects (5–200 cards) |
| `color_identity` | string[] | No | Color identity for legality checking |
| `format` | string | No | Format context (default: `commander`) |

#### Response body (success)

```json
{
  "success": true,
  "summary": "Your deck has a solid mana base but lacks sufficient card draw...",
  "cuts": [
    {
      "card_name": "Temple of the False God",
      "reason": "Inconsistent in early game without enough lands",
      "severity": "underperforming"
    }
  ],
  "additions": [
    {
      "card_name": "Rhystic Study",
      "reason": "Provides consistent card advantage in multiplayer games",
      "replaces": "Temple of the False God",
      "category": "Draw"
    }
  ],
  "mana_curve_notes": "Curve is slightly heavy at 4+ CMC",
  "confidence": 0.85
}
```

---

### Price Snapshot

**Endpoint**: `POST supabase/functions/price-snapshot`

Captures daily price snapshots from Scryfall for tracked cards. Sources include user collections, popular community deck cards, and a curated staples watchlist (~90 high-value cards).

**Auth**: Anon JWT accepted.

#### Request body

```json
{}
```

No parameters required.

#### Response body (success)

```json
{
  "success": true,
  "snapshotCount": 1250,
  "sources": {
    "collection": 800,
    "community": 200,
    "watchlist": 90,
    "uniqueTracked": 950
  }
}
```

#### Cron schedule

Runs daily at **01:00 UTC** via `pg_cron` job `price-snapshot-nightly`.

#### Data retention

Snapshots older than 90 days are automatically deleted during each run.

---

### Card Meta Context

**Endpoint**: `POST supabase/functions/card-meta-context`

AI-powered "Why This Card Is Played" rationale generator. Returns strategic reasoning and archetype tags for a card.

**Auth**: Anon JWT accepted.

**Rate limit**: 15 requests per 500 seconds per IP.

#### Request body

```json
{
  "cardName": "Rhystic Study",
  "typeLine": "Enchantment",
  "oracleText": "Whenever an opponent casts a spell...",
  "colorIdentity": ["U"],
  "edhrecRank": 5,
  "legalities": { "commander": "legal", "modern": "not_legal" }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cardName` | string | Yes | Card name |
| `typeLine` | string | Yes | Card type line |
| `oracleText` | string | No | Oracle text for context |
| `colorIdentity` | string[] | No | Color identity |
| `edhrecRank` | number | No | EDHREC popularity rank |
| `legalities` | object | No | Format legality map |

#### Response body (success)

```json
{
  "success": true,
  "rationale": "Rhystic Study is a premier card advantage engine in Commander. It punishes opponents who don't pay the tax and provides consistent draw in multiplayer games.",
  "archetypes": ["Control", "Draw-Go", "Enchantress"],
  "cached": false
}
```

Results are cached for 7 days.

---

### Card Similarity

**Endpoint**: `POST supabase/functions/card-similarity`

Generates Scryfall queries for similar cards and budget alternatives, plus AI-powered synergy suggestions.

**Auth**: Anon JWT accepted.

**Rate limit**: 15 requests per 500 seconds per IP.

#### Request body

```json
{
  "cardName": "Rhystic Study",
  "typeLine": "Enchantment",
  "oracleText": "Whenever an opponent casts a spell...",
  "colorIdentity": ["U"],
  "keywords": ["draw"],
  "cmc": 3,
  "prices": { "usd": "45.00" }
}
```

#### Response body (success)

```json
{
  "success": true,
  "similarQuery": "t:enchantment id<=U mv>=2 mv<=4 o:\"draw\" -!\"Rhystic Study\"",
  "budgetQuery": "t:enchantment id<=U o:\"draw\" -!\"Rhystic Study\" usd<22",
  "synergyCards": [
    { "name": "Mystic Remora", "reason": "Similar tax effect for early game card draw" },
    { "name": "Consecrated Sphinx", "reason": "Powerful draw engine that scales with opponents" }
  ],
  "cached": false
}
```

---

### Card Recommendations

**Endpoint**: `POST supabase/functions/card-recommendations`

Returns cards commonly played alongside a given card, powered by the `card_cooccurrence` table built from tournament data.

**Auth**: Anon JWT accepted.

#### Request body

```json
{
  "oracle_id": "abc123-def456",
  "format": "all",
  "limit": 20
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `oracle_id` | string | required | Scryfall oracle ID of the card |
| `format` | string | `"all"` | Format filter |
| `limit` | number | `20` | Max results (capped at 50) |

#### Response body (success)

```json
{
  "success": true,
  "oracle_id": "abc123-def456",
  "format": "all",
  "recommendations": [
    {
      "oracle_id": "xyz789",
      "card_name": "Sol Ring",
      "cooccurrence_count": 450,
      "mana_cost": "{1}",
      "type_line": "Artifact",
      "image_url": "https://..."
    }
  ]
}
```

---

### Deck Ideas

**Endpoint**: `POST supabase/functions/deck-ideas`

AI-powered deck concept generator. Returns archetype, strategy, key cards, synergy pieces, and budget options from a natural language query.

**Auth**: Anon JWT accepted.

**Rate limit**: 10 requests per 300 seconds per IP.

#### Request body

```json
{
  "query": "aristocrats deck with treasure tokens"
}
```

#### Response body (success)

```json
{
  "success": true,
  "archetype": "Rakdos Treasure Aristocrats",
  "strategy": "Sacrifice treasure tokens and creatures for value, draining opponents with blood artist effects while generating card advantage.",
  "keyCards": ["Korvold, Fae-Cursed King", "Dockside Extortionist", "Pitiless Plunderer"],
  "synergyPieces": ["Revel in Riches", "Marionette Master", "Xorn"],
  "budgetOptions": ["Mayhem Devil", "Deadly Dispute", "Treasure Keeper"]
}
```

---

### Detect Archetypes

**Endpoint**: `POST supabase/functions/detect-archetypes`

Analyzes community decks and assigns archetype labels based on card text patterns. Processes up to 200 untagged decks per invocation.

**Auth**: Service role key required.

#### Request body

```json
{}
```

#### Response body (success)

```json
{
  "success": true,
  "tagged": 45,
  "total": 200
}
```

#### Detected archetypes

`tokens`, `aristocrats`, `treasure`, `blink`, `graveyard`, `artifacts`, `spellslinger`, `ramp`, `aggro`, `control`, `voltron`, `tribal`, `combo`, `stax`

---

### Cleanup Logs

**Endpoint**: `POST supabase/functions/cleanup-logs`

Deletes `translation_logs` and `analytics_events` older than 30 days to prevent database bloat.

**Auth**: Admin role required.

**Rate limit**: 1 request per 10 seconds.

#### Request body

```json
{}
```

#### Response body (success)

```json
{
  "success": true,
  "deletedLogs": 1250,
  "deletedAnalytics": 340,
  "cutoffDate": "2025-02-07T00:00:00.000Z",
  "retentionDays": 30,
  "responseTimeMs": 450
}
```

#### Cron schedule

Runs daily at **02:00 UTC** via `pg_cron` job `cleanup-logs-nightly`.

---

### Warmup Cache

**Endpoint**: `POST supabase/functions/warmup-cache`

Pre-populates the `query_cache` with common MTG search patterns (~330 queries including staples, archetypes, and tribal searches). Run after deployment to boost cache hit rate.

**Auth**: Admin role required.

**Rate limit**: 1 request per 10 seconds.

#### Request body (optional)

```json
{
  "queries": ["custom query 1", "simic landfall"]
}
```

If `queries` is provided, only those queries are warmed. Otherwise, the built-in list of ~330 common queries is used.

#### Response body (success)

```json
{
  "success": true,
  "message": "Cache warmup complete",
  "results": {
    "total": 330,
    "newlyCached": 280,
    "alreadyCached": 45,
    "failed": 5
  },
  "durationMs": 45000
}
```

---

## Client-Side Scryfall

The frontend Scryfall client (`src/lib/scryfall/client.ts`) automatically appends `-is:rebalanced` to all queries to exclude Alchemy rebalanced cards from results.

### Printings

`src/lib/scryfall/printings.ts` — fetches all printings for a card name, sorted by release date. Used by the `PrintingPickerPopover` in the deck editor. Results are cached module-level per card name for the lifetime of the deck editor session.

### Collection price lookup

`src/hooks/useDeckPrice.ts` — batches up to 75 card names per request against the Scryfall `/cards/collection` endpoint to compute total mainboard USD value. Uses the shared Scryfall ref-cache so already-fetched cards cost zero additional requests.
