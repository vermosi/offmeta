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

Processes a pending `search_feedback` row: validates the issue, optionally generates a `translation_rules` entry, and updates the feedback status.

---

## Client-Side Scryfall

The frontend Scryfall client (`src/lib/scryfall/client.ts`) automatically appends `-is:rebalanced` to all queries to exclude Alchemy rebalanced cards from results.

### Printings

`src/lib/scryfall/printings.ts` — fetches all printings for a card name, sorted by release date. Used by the `PrintingPickerPopover` in the deck editor. Results are cached module-level per card name for the lifetime of the deck editor session.

### Collection price lookup

`src/hooks/useDeckPrice.ts` — batches up to 75 card names per request against the Scryfall `/cards/collection` endpoint to compute total mainboard USD value. Uses the shared Scryfall ref-cache so already-fetched cards cost zero additional requests.
