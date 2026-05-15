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
