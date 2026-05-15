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
