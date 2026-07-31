# Configuration

This page explains which environment variables matter, where they are used, and how the app distinguishes frontend runtime values from privileged server-side values.

## Environment Variables

- Frontend canonical values: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- Edge-function canonical values: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`
- Test and local-tooling fallbacks: some Deno and Node helpers can read the frontend `VITE_SUPABASE_*` names when the corresponding `SUPABASE_*` values are not available locally

The fallback behavior exists to reduce local setup friction. It does not change the production contract.

## Runtime Ownership

- The frontend client in [`src/integrations/supabase/client.ts`](../src/integrations/supabase/client.ts) only reads the `VITE_...` variables.
- Edge functions only read the server-side `SUPABASE_...` variables.
- Production should treat the runtime-specific names as canonical.
- Test harnesses and local helpers may fall back to the frontend names, but they should not redefine the contract.

That split matters because it keeps secrets out of browser code and makes the runtime boundary visible in the repo.

## Cache And Jobs

- `useCache` controls semantic-search cache usage.
- Cron jobs and schedules are defined in the database.
- Cache behavior is part of the search pipeline, not just a debugging toggle.

## Common Pitfalls

- Using `VITE_...` names in edge-function code can mask a deployment issue.
- Using `SUPABASE_...` names in client code can leak privileged assumptions into the browser build.
- Treat local fallbacks as convenience only.

## Canonical References

- `supabase/functions/semantic-search/config.ts`
- `supabase/config.toml`
- [README configuration section](../README.md#configuration)

## Working Rule

If you are not sure which variable a file should read, ask one question: "Will this code run in the browser or on the server?" That answer usually tells you which prefix is correct.
