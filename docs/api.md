# API

## Semantic search (Supabase Edge Function)
**Endpoint**: `supabase/functions/semantic-search`

### Request body
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

### Response body (success)
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

### Cache bypass
Set `useCache: false` in the request body to bypass memory and persistent caches.

### Headers
Responses include `x-request-id` for correlation in logs.
