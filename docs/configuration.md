# Configuration

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL for the frontend client. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon/public key for the frontend client. |
| `SUPABASE_URL` | Yes | Supabase project URL for Edge Functions. |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon key for Edge Functions that need public access. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key for admin operations. |
| `LOVABLE_API_KEY` | Yes | API key used by the AI translation service. |
| `RUN_QUERY_VALIDATION_CHECKS` | No | Set to `true` to run validation checks on function startup. |
| `LOG_ALL_TRANSLATIONS` | No | Set to `true` for verbose translation logging. |

See `.env.example` for safe placeholders.

## Node version
- Node.js 20.11+ (see `.nvmrc`)
