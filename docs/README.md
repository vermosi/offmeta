# Documentation Hub

This directory is the written map for OffMeta. It collects the project's core references, explains where the important systems live, and points to the canonical documents for setup, testing, deployment, and product direction.

If you are looking for the shortest route into the codebase, start here:

1. Read the top-level [README](../README.md) for the product pitch and live status.
2. Open [Architecture](./architecture.md) to understand how search, translation, auth, and edge functions fit together.
3. Use [Development](./development.md) for local setup and everyday commands.
4. Use [Testing](./testing.md) for the canonical test workflow and CI coverage.

## Core References

- [README](../README.md) - project overview and main entry point
- [Architecture](./architecture.md) - system layout, data flow, and backend boundaries
- [API](./api.md) - edge-function contracts and request/response examples
- [Development](./development.md) - local setup, commands, and contributor workflow
- [Testing](./testing.md) - test strategy, suites, and CI expectations
- [Configuration](./configuration.md) - environment variables, runtime ownership, and scheduled jobs
- [Deployment](./deployment.md) - production rollout and release process
- [Internationalization](./i18n.md) - locale system and translation flow
- [Guides](./guides.md) - search-guide system and editorial structure

## Project Policies

- [CONTRIBUTING](../CONTRIBUTING.md) - contribution workflow and review expectations
- [CODE_OF_CONDUCT](../CODE_OF_CONDUCT.md) - community standards
- [SECURITY](../SECURITY.md) - vulnerability reporting path
- [GOVERNANCE](../GOVERNANCE.md) - maintainer and decision policy
- [TRADEMARK](../TRADEMARK.md) - branding rules
- [SUPPORT](../SUPPORT.md) - where to ask for help
- [TESTING](../TESTING.md) - policy pointer to test guidance
- [Security](./security.md) - security implementation index

## Current Reference

- [Roadmap](./roadmap.md) - active planning and future direction
- [FAQ](./FAQ.md) - common answers and user-facing clarifications
- [Community Issues](./community-issues.md) - current feedback tracking
- [Triage](./TRIAGE.md) - issue intake and prioritization workflow

## Reading Tips

- Treat the docs as layered entry points, not a single linear manual.
- Prefer the canonical source of truth in code when a docs page and implementation disagree.
- If you are tracing search behavior, pair [Architecture](./architecture.md) with the code under `src/lib/search/` and `supabase/functions/semantic-search/`.
- If you are tracing release or rollout behavior, pair [Deployment](./deployment.md) with the active workflows under `.github/workflows/`.
