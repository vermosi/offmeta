# Community Issues Backlog

This backlog captures community-friendly issues pulled from the project status notes.
Each issue is formatted for direct entry into GitHub.

Tracking format: `[Status: <planned|in progress|blocked>] [Priority: <P0-P3>] [Discussion: <GitHub issue|milestone|owner/status>]`

## 9) Close deterministic search gaps for common natural-language queries

**Tracking:** `[Status: planned] [Priority: P1] [Discussion: GitHub issue #TBD (create on intake); milestone "search quality"]`

**Labels:** `search`, `enhancement`, `help wanted`

**Description**
Cover the ordinary search phrases that currently fall through to an empty deterministic query and therefore require the slower AI translation path.

**Scope / Tasks**

- Add patterns for drawing multiple cards and single-card draw phrases.
- Add toughness comparators to mirror the existing power comparator behavior.
- Add mana-fixing and vintage cube staple patterns where appropriate.

**Acceptance Criteria**

- Common draw and toughness searches no longer fall through to empty output.
- Mana-fixing searches preserve the user’s intent.
- Regression tests lock the new deterministic patterns.

## 10) Audit orphaned edge functions and scheduled jobs

**Tracking:** `[Status: in progress] [Priority: P2] [Discussion: GitHub issue #TBD (create on intake); milestone "maintenance"]`

**Labels:** `maintenance`, `infra`, `backend`

**Description**
Confirm whether deployed edge functions that have no client call sites are still wired up by external schedules or dashboard configuration.

Current audit notes:

- `cleanup-logs` is documented in `docs/api.md`, referenced in the changelog, and backed by a migration-defined daily `pg_cron` job at 02:00 UTC.
- `promote-searches` is documented in `docs/api.md` and the function itself is present and auth-gated, but no migration-backed schedule was found in the repo scan.
- `generate-patterns` has explicit migration-backed cron wiring, so it can be used as the control case for schedule verification.
- The next concrete decision is whether `promote-searches` should gain a migration-backed cron entry or be treated as a documented manual/admin-only endpoint.

**Scope / Tasks**

- Verify whether `promote-searches` is externally scheduled outside source control.
- Align changelog claims with the actual cron wiring that exists in migrations.
- Remove or document genuinely orphaned functions after schedule confirmation.

**Acceptance Criteria**

- Every deployed function has a documented purpose or an explicit removal plan.
- Scheduled jobs match the documented maintenance behavior.
- The function inventory is easier to audit.

## 11) Split large core modules into focused units

**Tracking:** `[Status: planned] [Priority: P2] [Discussion: GitHub issue #TBD (create on intake); milestone "maintainability"]`

**Labels:** `refactor`, `maintainability`, `search`

**Description**
Break up the largest monolithic modules on the critical path so behavior is easier to test, review, and evolve.

Current progress:

- Extracted URL/filter/session plumbing from `src/hooks/useSearch.ts` into `src/lib/search/search-state.ts`.
- Added unit coverage for the extracted helper module.

**Scope / Tasks**

- Split the largest search and analytics files into smaller modules.
- Keep public APIs stable while extracting internal helpers.
- Preserve test coverage across the refactor.

**Acceptance Criteria**

- No single critical-path module remains a one-file bottleneck.
- Refactored units have targeted tests.
- The code remains behaviorally stable.

## 12) Clarify language coverage for deterministic search

**Tracking:** `[Status: planned] [Priority: P2] [Discussion: GitHub issue #TBD (create on intake); milestone "search quality"]`

**Labels:** `i18n`, `search`, `ux`

**Description**
Document and improve the gap between the localized UI and the English-only deterministic parser so non-English users understand the current behavior.

Current progress:

- Documented the English-first deterministic layer in [docs/FAQ.md](./FAQ.md).
- Clarified the translation-first data flow in [docs/architecture.md](./architecture.md).

**Scope / Tasks**

- Document the translation-first behavior in search.
- Evaluate whether more deterministic patterns can be made language-aware.
- Keep the fallback path understandable when translation is required.

**Acceptance Criteria**

- The product documents how non-English search is handled.
- The deterministic path remains clear about its English-only assumptions where applicable.
- Any improvements are testable and explicit.

## 13) Unify Supabase env var naming across runtimes

**Tracking:** `[Status: planned] [Priority: P3] [Discussion: GitHub issue #TBD (create on intake); milestone "config cleanup"]`

**Labels:** `config`, `maintenance`, `backend`

**Description**
Reduce confusion and drift risk by standardizing the duplicated Supabase environment variable names used by the frontend and edge functions.

Current progress:

- Documented the runtime ownership of `VITE_SUPABASE_*` vs `SUPABASE_*` variables in [docs/configuration.md](./configuration.md).
- Clarified which names are canonical for the frontend client versus edge functions.

**Scope / Tasks**

- Document which env vars are authoritative in each runtime.
- Remove redundant aliases where possible.
- Update setup docs and examples accordingly.

**Acceptance Criteria**

- The env var contract is documented in one place.
- New contributors can tell which values belong to frontend vs edge runtime.
- Redundant naming does not create silent divergence.

## 14) Break up the monolithic translation golden test suite

**Tracking:** `[Status: planned] [Priority: P3] [Discussion: GitHub issue #TBD (create on intake); milestone "testing"]`

**Labels:** `testing`, `maintainability`, `search`

**Description**
Split the very large golden translation test file into smaller suites so failures are easier to localize and maintain.

Current progress:

- Split the original monolithic suite into smaller topical files:
  - `src/lib/translation-golden.tribal.test.ts`
  - `src/lib/translation-golden.core.test.ts`
  - `src/lib/translation-golden.advanced.test.ts`
  - `src/lib/translation-golden.extras.test.ts`
  - `src/lib/translation-golden.more.test.ts`
- Moved shared helpers into `src/lib/translation-golden.shared.ts`.

**Scope / Tasks**

- Group tests by translation feature or query family.
- Keep the current coverage while reducing file size.
- Preserve the golden assertions that protect the parser.

**Acceptance Criteria**

- The test coverage is unchanged or improved.
- Failures point to a narrower feature area.
- The suite is easier to extend safely.

## 15) Clean up committed environment files and rename boilerplate metadata

**Tracking:** `[Status: completed] [Priority: P3] [Discussion: GitHub issue #TBD (create on intake); milestone "hygiene"]`

**Labels:** `hygiene`, `security`, `documentation`

**Description**
Address low-risk repository hygiene items including committed env files, boilerplate package metadata, unused dependencies, missing releases, and a11y coverage claims.

Completed:

- Removed the tracked `.env` file from git index while leaving the local file in place.
- Renamed the package metadata in `package.json` to `offmeta` with version `0.1.0`.
- Synced `package-lock.json` metadata to match the project name and version.
- Tightened the README accessibility badge to reflect route-level coverage instead of implying blanket app coverage.
- Removed unused runtime dependencies `@hookform/resolvers`, `@uppy/dashboard`, and `@uppy/drag-drop`.
- Documented the release/versioning flow in [docs/deployment.md](./deployment.md).

**Result**

- Sensitive environment files are no longer tracked in git.
- Repo metadata now matches OffMeta branding.
- The public documentation now reflects the actual test and accessibility coverage.
