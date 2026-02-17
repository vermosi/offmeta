# API

## Edge Functions

### Semantic Search

**Endpoint**: `supabase/functions/semantic-search`

#### Request body

```json
{
  "query": "red or black creature that draws cards",
  "filters": {
    "format": "commander",
    "colorIdentity": ["R", "B"]
  },
  "useCache": true,
  "cacheSalt": "debug-123",
  "debug": {
    "forceFallback": false,
    "validateScryfall": false
  }
}
```

#### Response body (success)

```json
{
  "success": true,
  "originalQuery": "...",
  "scryfallQuery": "...",
  "explanation": {
    "readable": "Searching for: ...",
    "assumptions": [],
    "confidence": 0.82
  },
  "intent": {
    "colors": { "values": ["r", "b"], "isIdentity": false },
    "deterministicQuery": "..."
  },
  "cached": false,
  "source": "ai"
}
```

#### Cache bypass

Set `useCache: false` in the request body to bypass memory and persistent caches.

#### Headers

- Responses include `x-request-id` for correlation in logs.
- Requests should include `x-session-id` for server-side rate limiting.

---

### Combo Search

**Endpoint**: `supabase/functions/combo-search`

Proxies requests to the Commander Spellbook API to find combos for a given commander.

#### Request body

```json
{
  "commanderName": "Thassa's Oracle"
}
```

#### Response body (success)

Returns an array of combo objects from Commander Spellbook with cards, prerequisites, steps, and results.

---

### Deck Recommendations

**Endpoint**: `supabase/functions/deck-recommendations`

Uses AI (Gemini Flash) to analyze a decklist and generate categorized card suggestions.

#### Request body

```json
{
  "commander": "Atraxa, Praetors' Voice",
  "decklist": ["Sol Ring", "Command Tower", "..."],
  "budget": "medium"
}
```

#### Response body (success)

Returns categorized recommendations: High Synergy, Upgrades, and Budget Picks, each with card name, reason, and category.

---

### Fetch Moxfield Deck

**Endpoint**: `supabase/functions/fetch-moxfield-deck`

Proxies Moxfield API requests to extract decklists from Moxfield URLs (avoids CORS issues).

#### Request body

```json
{
  "url": "https://www.moxfield.com/decks/abc123"
}
```

#### Response body (success)

Returns the deck's commander and card list extracted from the Moxfield API response.

---

### Admin Analytics

**Endpoint**: `supabase/functions/admin-analytics`

Returns aggregated search analytics data. Requires admin role authentication.

---

### Process Feedback

**Endpoint**: `supabase/functions/process-feedback`

Processes user-submitted search feedback and optionally generates translation rules.

---

## Client-Side Scryfall

The frontend Scryfall client (`src/lib/scryfall/client.ts`) automatically appends `-is:rebalanced` to all queries to exclude Alchemy rebalanced cards from results.
