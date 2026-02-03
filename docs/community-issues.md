# Community Issues Backlog

This backlog captures community-friendly issues pulled from the project status notes.
Each issue is formatted for direct entry into GitHub.

## 1) Add contract tests for Supabase Edge Functions (local)

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

## 2) Document deployment steps for Supabase + hosting provider

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

## 3) Improve accessibility audits and keyboard navigation

**Labels:** `enhancement`, `accessibility`, `good first issue`

**Description**
Audit the application for accessibility issues and improve keyboard navigation support throughout the UI.

**Scope / Tasks**

- Run automated accessibility audits (axe, Lighthouse).
- Fix focus trapping in modals.
- Ensure all interactive elements are keyboard-accessible.
- Add ARIA labels where missing.

**Acceptance Criteria**

- No critical accessibility violations in automated audits.
- Modal focus trapping works correctly.
- All features usable via keyboard alone.
