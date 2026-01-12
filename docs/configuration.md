# Configuration

## Environment variables
Copy `.env.example` to `.env` and populate the values.

### Frontend (Vite)
| Variable | Required | Description |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL used by the frontend client. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon/publishable key. |

### Supabase Edge Functions
| Variable | Required | Description |
| --- | --- | --- |
| `SUPABASE_URL` | Yes | Supabase project URL for server-side clients. |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon key for public calls (warmup). |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key for cache/rules tables. |
| `LOVABLE_API_KEY` | Yes | API key for the AI gateway used in query translation. |
| `LOG_ALL_TRANSLATIONS` | No | Set to `true` to log all translations (debug only). |
| `RUN_QUERY_VALIDATION_CHECKS` | No | Set to `true` to validate against Scryfall during translation. |

## Cache controls
The semantic search edge function accepts a `useCache` flag in the request body. Set `useCache: false` to bypass all cache layers for debugging.
