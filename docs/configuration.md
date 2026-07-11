# Configuration

This page is the short index for environment and scheduler setup.

## Environment variables

- Frontend values: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- Edge-function values: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`
- Compatibility aliases used in tests and local tooling: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` may be read by Deno/Node helpers when the canonical frontend variables are not available.

## Runtime ownership

- The frontend client at `src/integrations/supabase/client.ts` only reads the `VITE_...` variables.
- Edge functions only read the server-side `SUPABASE_...` variables.
- Test harnesses and local helpers may read either form to reduce setup friction, but production should treat the runtime-specific names as canonical.

## Cache and jobs

- `useCache` controls semantic-search cache usage
- Cron jobs and schedules are defined in the database

## Canonical references

- `supabase/functions/semantic-search/config.ts`
- `supabase/config.toml`
- [README configuration section](../README.md#configuration)
