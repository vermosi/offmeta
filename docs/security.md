# Security

This page is the short index for the security model.

## Start here

- [Repo security overview](../README.md#security)
- [SECURITY.md](../SECURITY.md)
- [AGENTS.md](../AGENTS.md)

## Primary references

- `supabase/functions/_shared/auth.ts` for auth helpers
- `supabase/functions/admin-rpc/index.ts` for admin dispatch
- `supabase/functions/admin-rpc-guard-tests/index.ts` for RBAC verification
- `src/lib/security/` for client-side security utilities and tests

## Current focus

The important pattern is:

- tables use RLS
- admin actions use guarded `SECURITY DEFINER` RPCs
- networked or secret-bearing work stays in edge functions

For the detailed RBAC walkthrough, see the root [README security section](../README.md#security).
