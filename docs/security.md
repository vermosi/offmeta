# Security

## Admin RBAC: `SECURITY DEFINER` + internal `public.has_role('admin')`

OffMeta exposes admin functionality (analytics, system status, AI usage, conversion funnel) as Postgres RPCs called from the admin dashboard over PostgREST. Authorization for those RPCs is enforced **inside the function body**, not via Postgres `EXECUTE` grants.

### The pattern

Every admin RPC follows the same shape:

```sql
create or replace function public.get_system_status()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 1. Authorization guard (runs first, raises 403 for non-admins)
  if not public.has_role(auth.uid(), 'admin'::app_role) then
    raise exception 'Forbidden: admin role required'
      using errcode = 'P0001';
  end if;

  -- 2. Privileged work (bypasses RLS thanks to SECURITY DEFINER)
  return ( ... );
end;
$$;

revoke all on function public.get_system_status() from public;
grant execute on function public.get_system_status() to authenticated;
```

`public.has_role` is itself `SECURITY DEFINER` and reads from `public.user_roles` — see the canonical implementation in [`user-roles`](#user-roles-table) below.

### Why `EXECUTE` is granted to `authenticated` (and why that's safe)

PostgREST sets the Postgres session role from the request's JWT to **exactly one** of three roles: `anon`, `authenticated`, or `service_role`. It does **not** read `user_roles.role = 'admin'` and does **not** issue `SET ROLE admin_user`. So:

| Approach | Result |
|---|---|
| Revoke `EXECUTE` from `authenticated` | Real admins (who hit PostgREST as `authenticated`) get `permission denied`. Dashboard breaks. |
| Grant `EXECUTE` only to a custom `admin_role` Postgres role | PostgREST never `SET ROLE`s to it. Same breakage. |
| **Grant `EXECUTE` to `authenticated` + internal `has_role()` guard** | Non-admins receive `P0001 Forbidden: admin role required`. Admins succeed. |

The third row is what we do, and it is the pattern Supabase officially recommends for RBAC over PostgREST.

### What the Supabase linter says about this

Lint `0029` ("Function with `SECURITY DEFINER` is `EXECUTE`-able by `authenticated`") fires on every admin RPC. The lint is **structural** — it does not read the function body and cannot see the `has_role()` guard. It is intentionally accepted with the justification:

> Intentional admin RPC. `SECURITY DEFINER` is required to bypass RLS on admin-scope tables. Authorization is enforced via the internal `public.has_role('admin')` guard that raises `P0001 Forbidden: admin role required` for non-admins. Revoking `EXECUTE` from `authenticated` would block real admins because PostgREST executes every authenticated request as the `authenticated` role.

### Verification

Authorization guards are continuously verified by the `admin-rpc-guard-tests` edge function (`supabase/functions/admin-rpc-guard-tests/index.ts`). It asserts that:

1. **Anon callers** receive `42501 permission denied for function ...` for every admin RPC (via the `EXECUTE` revoke from `anon`).
2. **Authenticated non-admins** receive `P0001 Forbidden: admin role required` from the internal `has_role()` guard.

Run it after any change to admin RPCs or `public.has_role`:

```bash
curl -X POST https://<project-ref>.functions.supabase.co/admin-rpc-guard-tests \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

A non-200 response means a guard regressed.

### When NOT to use this pattern

- **Tables.** Use RLS policies. `SECURITY DEFINER` is for functions only.
- **Public discovery RPCs** (e.g. `get_curated_searches`, `get_archetype_signals`). Those are intentionally callable by `anon` and must not contain a `has_role` guard.
- **Service-role-only operations.** Move them to an edge function and call with `SUPABASE_SERVICE_ROLE_KEY` server-side instead of exposing a `SECURITY DEFINER` function.

### user_roles table

Roles live in a dedicated table, never on `profiles`:

```sql
create type public.app_role as enum ('admin', 'moderator', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;
```

This avoids RLS recursion (the function is `SECURITY DEFINER` so it doesn't re-trigger `user_roles` policies when called from another policy or RPC).

---

## Checklist: adding a new admin-only `SECURITY DEFINER` RPC

Use this every time you introduce a new admin-gated RPC. All boxes must be checked before merge.

### 1. Schema placement
- [ ] Define the function in the **private `admin_api` schema** (never `public`).
  ```sql
  create or replace function admin_api.get_my_new_admin_rpc(...)
  returns ...
  language plpgsql
  security definer
  set search_path = public
  set statement_timeout = '15s'
  as $$ ... $$;
  ```
- [ ] Do **not** add the function to `public` — `admin_api` is hidden from PostgREST and the only intentional path is the `admin-rpc` edge dispatcher.

### 2. Internal authorization guard (defense-in-depth)
- [ ] First statement of the function body **must** be:
  ```sql
  if not public.has_role('admin'::app_role) then
    raise exception 'Forbidden: admin role required';
  end if;
  ```
  This protects against any caller who somehow obtains the service-role key and tries to invoke the function via PostgREST.

### 3. Grants
- [ ] Revoke `EXECUTE` from everyone, then grant only to `service_role`:
  ```sql
  revoke all on function admin_api.get_my_new_admin_rpc(...) from public, anon, authenticated;
  grant execute on function admin_api.get_my_new_admin_rpc(...) to service_role;
  ```
- [ ] Schema-level grants are already in place (`USAGE on admin_api` is granted only to `service_role`); do not relax them.

### 4. Edge dispatcher whitelist
- [ ] Add the function name and its allowed arg keys to the `ALLOWED` map in `supabase/functions/admin-rpc/index.ts`:
  ```ts
  const ALLOWED: Record<string, readonly string[]> = {
    // ...existing entries
    get_my_new_admin_rpc: ['arg_one', 'arg_two'],
  };
  ```
- [ ] Anything not in `ALLOWED` is rejected with `400 Unknown function` before reaching the database.

### 5. Guard-test coverage (expected behavior)
- [ ] Add the new function to `ADMIN_FNS` in `supabase/functions/admin-rpc-guard-tests/index.ts`.
- [ ] Re-run guard tests and confirm the new function appears in the report with all three checks passing:

  | Caller                       | Endpoint                              | Expected status |
  |------------------------------|---------------------------------------|-----------------|
  | Anon (PostgREST direct)      | `POST /rest/v1/rpc/<fn>`              | `404` (schema not exposed) |
  | Anon                         | `POST /functions/v1/admin-rpc`        | `401 Unauthorized` |
  | Authenticated non-admin      | `POST /functions/v1/admin-rpc`        | `403 Forbidden: admin role required` |
  | Authenticated admin          | `POST /functions/v1/admin-rpc`        | `200` with `{ data: ... }` |

  The end-to-end Deno test (`index_test.ts`) will then automatically cover the non-admin 403 case for the new function with no further changes.

### 6. Frontend wiring
- [ ] Call the new RPC via `supabase.functions.invoke('admin-rpc', { body: { fn: 'get_my_new_admin_rpc', args: { ... } } })` — never `supabase.rpc(...)` directly.
- [ ] Handle the documented status codes (`401`, `403`, `400`, `500`) with user-facing messages in the admin UI.

---

## Running and interpreting `admin-rpc-guard-tests`

The `admin-rpc-guard-tests` edge function is the canonical proof that the admin authorization wall is intact. It exercises every admin endpoint with three caller identities and reports per-check pass/fail.

### What it covers

For every entry in `ADMIN_FNS` (currently `get_system_status`, `get_ai_usage_stats`, `get_conversion_funnel`, `get_search_analytics`):

1. **Direct PostgREST hit** to `POST /rest/v1/rpc/<fn>` — must `404` because the function lives in the private `admin_api` schema.
2. **`admin-rpc` dispatcher with anon JWT** — must `401 Unauthorized` (no valid user claims).
3. **`admin-rpc` dispatcher with a freshly-provisioned non-admin user JWT** — must `403 Forbidden: admin role required`.

The function returns HTTP `200` only if **every** check is blocked; otherwise it returns `500` with a `failures` array.

### Running locally (against the deployed Cloud backend)

The Deno test that wraps the edge function does not need any service-role secret locally — it only needs the public URL and anon key from `.env`:

```bash
# From the repo root, with the project's .env present:
deno test \
  --allow-net --allow-env \
  supabase/functions/admin-rpc-guard-tests/index_test.ts
```

What it does:
- Loads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from `.env`.
- Calls `POST /functions/v1/admin-rpc-guard-tests` (which has the service-role secret available in the edge runtime and provisions the throw-away non-admin user).
- Asserts every `admin-rpc:*` check for the `authenticated_non_admin` caller returned exactly `403`.

You can also hit the function directly to see the full report:

```bash
curl -s -X POST \
  -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY" \
  -H "Authorization: Bearer $VITE_SUPABASE_PUBLISHABLE_KEY" \
  "$VITE_SUPABASE_URL/functions/v1/admin-rpc-guard-tests" | jq
```

### Running in CI

Add a step that invokes the same Deno test. CI only needs the two public env vars (no service-role secret) because the heavy lifting happens inside the edge function:

```yaml
- name: Admin RPC guard tests
  env:
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
    VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
  run: |
    deno test --allow-net --allow-env \
      supabase/functions/admin-rpc-guard-tests/index_test.ts
```

A non-zero exit code means the wall has been breached — block the merge.

### Sample healthy output

```json
{
  "ok": true,
  "total": 12,
  "blocked": 12,
  "failures": [],
  "results": [
    {
      "check": "postgrest:get_system_status",
      "caller": "unauthenticated",
      "status": 404,
      "blocked": true,
      "reason": "unreachable via PostgREST (expected)",
      "body_excerpt": "{\"code\":\"PGRST202\",\"details\":\"Searched for the function public.get_system_status…\"}"
    },
    {
      "check": "admin-rpc:get_system_status",
      "caller": "anon",
      "status": 401,
      "blocked": true,
      "reason": "blocked with 401 (expected)",
      "body_excerpt": "{\"error\":\"Unauthorized\"}"
    },
    {
      "check": "admin-rpc:get_system_status",
      "caller": "authenticated_non_admin",
      "status": 403,
      "blocked": true,
      "reason": "blocked with 403 (expected)",
      "body_excerpt": "{\"error\":\"Forbidden: admin role required\"}"
    }
    /* …same three checks repeated for the other admin functions… */
  ]
}
```

### Sample failure (regression — wall broken)

If, for example, the new `get_system_status` accidentally remains in `public` AND grants `EXECUTE` to `authenticated`, the report will show:

```json
{
  "ok": false,
  "total": 12,
  "blocked": 10,
  "failures": [
    {
      "check": "postgrest:get_system_status",
      "caller": "unauthenticated",
      "status": 200,
      "blocked": false,
      "reason": "reachable — schema leak!",
      "body_excerpt": "{\"cron_jobs\":[…],\"data_freshness\":{…}}"
    },
    {
      "check": "admin-rpc:get_system_status",
      "caller": "authenticated_non_admin",
      "status": 200,
      "blocked": false,
      "reason": "expected 403 but got 200",
      "body_excerpt": "{\"data\":{…}}"
    }
  ],
  "results": [ /* full per-check breakdown */ ]
}
```

### How to interpret each failure

| Failure shape                                                             | Likely cause                                                                                               | Fix |
|---------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------|-----|
| `postgrest:<fn>` returned `2xx`                                           | The function exists in `public` (or `admin_api` was exposed to PostgREST).                                 | Move the function to `admin_api`, drop the `public` copy, ensure `admin_api` is not in PostgREST's `db.schemas`. |
| `admin-rpc:<fn>` for `anon` returned anything other than `401`            | The dispatcher's JWT validation regressed (e.g. accepting unsigned tokens, or `getClaims` short-circuited).| Re-check `admin-rpc/index.ts` step 1; confirm `corsHeaders` are not also applied to non-OPTIONS methods.       |
| `admin-rpc:<fn>` for `authenticated_non_admin` returned `200`             | The dispatcher's `has_role('admin')` check regressed, OR the internal guard inside the function was dropped.| Restore the `if not public.has_role('admin') then raise…` guard AND the dispatcher's role check.               |
| `admin-rpc:<fn>` for `authenticated_non_admin` returned `401`             | The user JWT failed to mint — usually an auth-config drift (email confirmation policy changed).            | Inspect edge function logs; the test prints `partial_results` if the provisioning step failed.                 |
| Function returned `500` with `error: "could not provision non-admin user"`| The service-role key in the edge function environment is missing or revoked.                              | Re-add `SUPABASE_SERVICE_ROLE_KEY` to the function secrets and redeploy.                                       |

### Operational notes

- The non-admin user is created with a random email/password and is **not** cleaned up by the edge function itself — the `index_test.ts` wrapper deletes it via the auth admin API. If you call the edge function manually (curl), expect a few `guard-test-*@example.com` users to accumulate; prune them periodically.
- Run the test after **any** of: schema migration touching `admin_api`, edits to `supabase/functions/admin-rpc/index.ts`, changes to `public.has_role`, or changes to auth providers/email confirmation policy.
- Do not edit the test to "make it pass" — every assertion is a security invariant.
