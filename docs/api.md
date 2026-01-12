# API

## Supabase Edge Functions

### `semantic-search`
- **Endpoint**: `POST /functions/v1/semantic-search`
- **Purpose**: Translate natural-language queries into Scryfall syntax.
- **Payload**:
  - `query` (string, required)
  - `filters` (object, optional)
  - `context` (object, optional)
  - `useCache` (boolean, optional)
  - `cacheSalt` (string, optional)
- **Headers**: `X-Request-Id` is returned for correlation.

### `process-feedback`
- **Endpoint**: `POST /functions/v1/process-feedback`
- **Purpose**: Process user-submitted feedback and generate translation rules.

### `generate-patterns`
- **Endpoint**: `POST /functions/v1/generate-patterns`
- **Purpose**: Auto-generate translation rules from logs.

### `cleanup-logs`
- **Endpoint**: `POST /functions/v1/cleanup-logs`
- **Purpose**: Purge old translation logs.

### `warmup-cache`
- **Endpoint**: `POST /functions/v1/warmup-cache`
- **Purpose**: Pre-populate query cache.

Refer to the function source in `supabase/functions/` for full details.
