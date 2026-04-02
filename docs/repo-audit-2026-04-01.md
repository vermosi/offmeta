# OffMeta Repository Audit (2026-04-01)

This document captures a codebase audit focused on product focus, UX/IA, analytics, accessibility, engineering risk, security/privacy, SEO/content strategy, and testing readiness.

The full structured findings were delivered in the review response generated alongside this commit.

## Scope reviewed

- App routing and page surfaces
- Search, analytics, and onboarding flows
- Supabase edge function security/auth patterns
- Schema and analytics migrations
- Documentation and roadmap consistency
- Testing strategy and E2E coverage surface

## Key meta-findings

1. Product scope is broad relative to core JTBD (natural-language MTG card search).
2. Event taxonomy does not currently support robust activation/retention instrumentation.
3. Security posture is improved by shared auth utilities, but broad `verify_jwt = false` creates operational risk if endpoint-specific checks regress.
4. Accessibility foundations exist (skip links, focus trap) with likely modal/mobile edge-case gaps.
5. Content/SEO expansion risks diluting search-first user value if left ungoverned.

