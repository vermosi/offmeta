# Community Issues Backlog

This backlog captures community-friendly issues pulled from the project status notes.
Each issue is formatted for direct entry into GitHub.

Tracking format: `[Status: <planned|in progress|blocked>] [Priority: <P0-P3>] [Discussion: <GitHub issue|milestone|owner/status>]`

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
