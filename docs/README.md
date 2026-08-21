# Documentation Index

Start here if you want the shortest path through the docs.

## Start Here

| Doc | Use it for |
| --- | --- |
| [README](../README.md) | Product pitch, live status, and the top-level entry point |
| [Architecture](./architecture.md) | System layout, data flow, and backend boundaries |
| [Development](./development.md) | Local setup, commands, and contributor workflow |
| [Testing](./testing.md) | Canonical test surface and CI expectations |
| [Roadmap](./roadmap.md) | What we are working on now and next |
| [How OffMeta Search Works](./how-offmeta-search-works.md) | Natural-language search, LLM boundaries, and translation flow |

## Build

| Doc | Use it for |
| --- | --- |
| [Configuration](./configuration.md) | Environment variables, runtime ownership, and scheduled jobs |
| [Deployment](./deployment.md) | Production rollout and release process |
| [Internationalization](./i18n.md) | Locale system and translation flow |
| [Guides](./guides.md) | Search-guide system and editorial structure |

## Operate

| Doc | Use it for |
| --- | --- |
| [Security](./security.md) | Security implementation index |
| [Troubleshooting](./troubleshooting.md) | Common user-facing questions and recovery paths |
| [Triage](./TRIAGE.md) | Issue intake and prioritization workflow |

## Policy

| Doc | Use it for |
| --- | --- |
| [CONTRIBUTING](../CONTRIBUTING.md) | Contribution workflow and review expectations |
| [CODE_OF_CONDUCT](../CODE_OF_CONDUCT.md) | Community standards |
| [SECURITY](../SECURITY.md) | Vulnerability reporting path |
| [GOVERNANCE](../GOVERNANCE.md) | Maintainer and decision policy |
| [TRADEMARK](../TRADEMARK.md) | Branding rules |
| [SUPPORT](../SUPPORT.md) | Where to ask for help |
| [TESTING](../TESTING.md) | Policy pointer to test guidance |

## Reading Tips

- Treat the docs as a set of entry points, not a single linear manual.
- If a docs page and the implementation disagree, trust the code first.
- For search behavior, pair [Architecture](./architecture.md) with `src/lib/search/` and `supabase/functions/semantic-search/`.
- For release behavior, pair [Deployment](./deployment.md) with `.github/workflows/`.
