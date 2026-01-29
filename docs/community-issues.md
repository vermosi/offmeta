# Community Issues Backlog

This backlog captures community-friendly issues pulled from the project status notes.
Each issue is formatted for direct entry into GitHub.

## 1) Add automated tests for Edge Function behavior & translation fallback paths

**Labels:** `testing`, `help wanted`

**Description**
Expand automated tests around Supabase Edge Function behavior and translation fallback logic so regressions are caught early.

**Scope / Tasks**

- Identify Edge Function behaviors and fallback paths that should be covered.
- Add unit/integration tests for these behaviors.
- Ensure tests are repeatable and run locally.

**Acceptance Criteria**

- Tests cover the key translation fallback paths.
- Tests are runnable locally (documented or included in existing test scripts).
- CI (if available) runs these tests reliably.

## 2) Add contract tests for Supabase Edge Functions (local)

**Labels:** `testing`, `help wanted`

**Description**
Create contract tests that validate Supabase Edge Functions when running locally, ensuring request/response expectations match production behavior.

**Scope / Tasks**

- Define request/response contracts for Edge Functions.
- Implement tests that run against the local Supabase setup.
- Document the local setup needed to run these contract tests.

**Acceptance Criteria**

- Contract tests exist for core Edge Functions.
- Tests run against the local Supabase environment with clear setup steps.
- Expected response schema/behavior is validated.

## 3) Document deployment steps for Supabase + hosting provider

**Labels:** `documentation`, `help wanted`

**Description**
Add a deployment guide for Supabase and the hosting provider used by the project, including environment configuration.

**Scope / Tasks**

- Document Supabase project setup for this app.
- Document deployment steps for the hosting provider.
- Include required environment variables and configuration steps.

**Acceptance Criteria**

- A deployment guide exists (docs page or README section).
- Steps are clear and reproducible for new contributors.
- Environment variables and Supabase configuration are explicitly listed.
