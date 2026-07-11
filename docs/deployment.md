# Deployment

This guide covers the shortest path to deploy OffMeta with Supabase for data/edge functions and a static hosting provider for the frontend.

## Overview

OffMeta has two deployable surfaces:

- The React + Vite frontend
- Supabase Edge Functions and database schema

The frontend reads public Supabase values at runtime, while privileged operations stay in Edge Functions.

## Prerequisites

- A Supabase project with database access
- A frontend host that can serve a Vite build
- The environment variables documented in [Configuration](./configuration.md)
- The `npm` toolchain for local build verification

## Supabase setup

1. Create or select a Supabase project.
2. Apply the database migrations and schema from the repo.
3. Deploy the edge functions in `supabase/functions/`.
4. Set the required secrets in the Supabase dashboard or CLI:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `LOVABLE_API_KEY`
5. Verify the semantic-search function responds to a known query.

## Frontend setup

1. Set the frontend environment variables used by the app.
2. Build the app with `npm run build`.
3. Publish the `dist/` output to your hosting provider.
4. Confirm the deployed site can reach the Supabase project and edge functions.

## Local verification before deploy

- `npm run typecheck`
- `npm run test`
- `npm run build`

## Deployment checklist

- Public env vars are correct in the frontend host.
- Supabase secrets are present and match the deployed project.
- Edge function URLs are reachable from the deployed frontend.
- CORS headers are present on edge responses.
- Search and import flows work in the live environment.

## Releases

OffMeta uses semantic versioning and keeps unreleased changes in [`CHANGELOG.md`](../CHANGELOG.md).

Recommended release flow:

1. Confirm the changelog entries under `Unreleased` are ready to ship.
2. Run `npm run typecheck`, `npm run test`, and `npm run build`.
3. Bump `package.json` and `package-lock.json` together for the release version.
4. Create a git tag for the release and publish the corresponding changelog entry.
5. Deploy the frontend and edge changes together so the versioned docs match the shipped behavior.

## Troubleshooting

- If search fails, confirm the semantic-search function is deployed and the URL matches the frontend env vars.
- If edge requests return 401, confirm the anon key and auth headers are set correctly.
- If the frontend builds locally but fails in production, compare the host env values against `.env.local`.
