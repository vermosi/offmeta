# OffMeta

[![CI](https://github.com/vermosi/offmeta/actions/workflows/ci.yml/badge.svg)](https://github.com/vermosi/offmeta/actions/workflows/ci.yml)
[![Live Site](https://img.shields.io/badge/Live-offmeta.app-22c55e?style=flat-square)](https://offmeta.app)
[![License](https://img.shields.io/github/license/vermosi/offmeta?style=flat-square)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/vermosi/offmeta?style=social)](https://github.com/vermosi/offmeta)

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white&style=flat-square)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white&style=flat-square)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3-06B6D4?logo=tailwindcss&logoColor=white&style=flat-square)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white&style=flat-square)](https://vite.dev/)
[![Tests](https://img.shields.io/badge/tests-1560%2B-brightgreen?style=flat-square)](docs/testing.md)
[![E2E](https://img.shields.io/badge/e2e-PR%20smoke%20%2B%20nightly%20full-0ea5e9?style=flat-square)](docs/testing.md#ci-integration)
[![A11y](https://img.shields.io/badge/a11y-home%20%2B%20key%20routes-14b8a6?style=flat-square)](docs/testing.md#ci-integration)
[![Built with Lovable](https://img.shields.io/badge/Built%20with-Lovable-ff69b4?style=flat-square)](https://lovable.dev)

**Natural language search for Magic: The Gathering cards, powered by Scryfall.**

> _Describe what you're looking for in plain English. No complex syntax. No guessing. Just natural conversation._

OffMeta helps players find Magic cards by intent instead of memorizing Scryfall syntax. It translates plain-English searches into real Scryfall queries, shows the generated syntax back to you, and keeps the core search flow fast enough for repeated refinement.

**Live site:** [offmeta.app](https://offmeta.app)

## What OffMeta Does

- Search by card effect, role, theme, format, color, budget, or tribe
- Show the exact Scryfall query the app generated
- Let you refine searches without starting over
- Provide guides for common search patterns and syntax help
- Support adjacent tools like card comparison and combo discovery

## Repo Layout

- `src/` contains the React app, components, hooks, and search flow
- `supabase/functions/` contains translation, validation, and other privileged work
- `docs/` contains the canonical project documentation
- `.agents/skills/` contains local Codex skills for repo-specific workflows

## Where To Start

- [docs/README.md](docs/README.md) for the doc map
- [docs/architecture.md](docs/architecture.md) for the search pipeline and data flow
- [docs/development.md](docs/development.md) for local setup and commands
- [docs/testing.md](docs/testing.md) for the canonical test workflow
- [docs/roadmap.md](docs/roadmap.md) for what is being worked on now

---

## Documentation

All docs live in the centralized index: [docs/README.md](docs/README.md).

## Quick Start

```bash
npm install
npm run dev
```

Use `npm run test`, `npm run lint`, and `npm run build` before shipping changes.

---

## Legal

| Document                  | Description             |
| ------------------------- | ----------------------- |
| [LICENSE](LICENSE)        | AGPL-3.0 License        |
| [SECURITY](SECURITY.md)   | Vulnerability reporting |
| [TRADEMARK](TRADEMARK.md) | Branding guidelines     |


