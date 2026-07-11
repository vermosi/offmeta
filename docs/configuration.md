# Configuration

This page is the short index for environment and scheduler setup.

## Environment variables

- Frontend canonical values: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- Edge-function canonical values: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`
- Test and local-tooling fallbacks: some Deno/Node helpers read the frontend `VITE_SUPABASE_*` names when the corresponding `SUPABASE_*` values are not available locally, but those fallbacks are compatibility paths rather than the canonical contract.

## Runtime ownership

- The frontend client at `src/integrations/supabase/client.ts` only reads the `VITE_...` variables.
- Edge functions only read the server-side `SUPABASE_...` variables.
- Production should treat the runtime-specific names as canonical:
  - frontend code should rely on `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
  - edge functions should rely on `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `LOVABLE_API_KEY`
- Test harnesses and local helpers may fall back to the frontend names to reduce setup friction, but they should not redefine the canonical contract.

## Cache and jobs

- `useCache` controls semantic-search cache usage
- Cron jobs and schedules are defined in the database

## Canonical references

- `supabase/functions/semantic-search/config.ts`
- `supabase/config.toml`
- [README configuration section](../README.md#configuration)
