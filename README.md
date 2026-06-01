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
[![A11y](https://img.shields.io/badge/a11y-PR%20smoke%20%2B%20nightly%20full-14b8a6?style=flat-square)](docs/testing.md#ci-integration)
[![Built with Lovable](https://img.shields.io/badge/Built%20with-Lovable-ff69b4?style=flat-square)](https://lovable.dev)

**Natural language search for Magic: The Gathering cards, powered by Scryfall.**

> _Describe what you're looking for in plain English. No complex syntax. No guessing. Just natural conversation._

**Live site:** [offmeta.app](https://offmeta.app)

---

## ✨ Features

| Feature                          | Description                                                                                                |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Natural Language Search**      | Describe cards in plain English — AI translates to Scryfall syntax                                         |
| **200+ Deterministic Patterns**  | Fast, cached translations for common queries without AI calls                                              |
| **Combo Finder**                 | Discover card combos for any commander via Commander Spellbook                                             |
| **Deck Recommendations**         | AI-powered suggestions (High Synergy, Upgrades, Budget Picks) from Moxfield import or text paste           |
| **Archetypes**                   | Data-driven archetype browser across Commander, Pauper, Legacy & Premodern — backed by a materialized view |
| **10 Progressive Search Guides** | Learn from basic type searches to expert multi-constraint queries                                          |
| **Voice Input**                  | Hands-free searching with speech recognition                                                               |
| **Card Details**                 | Rulings, prices, printings, and legality in a clean modal                                                  |
| **Card Comparison**              | Compare 2–4 cards side-by-side on stats, price, and legality                                               |
| **Multiple View Modes**          | Grid, list, and image-only views with persistent preference                                                |
| **Export Results**               | Copy card names or download CSV for deck builders                                                          |
| **Smart Filters**                | Color, format, type, CMC, price, and rarity filter chips                                                   |
| **Alchemy Exclusion**            | Rebalanced digital-only cards automatically filtered out                                                   |
| **Client-Side Caching**          | Sub-100ms response for repeated queries                                                                    |
| **PWA Support**                  | Installable with offline-first architecture                                                                |
| **Dark/Light Theme**             | Automatic system preference detection                                                                      |
| **Mobile-First Design**          | Responsive from 320px to 1920px with progressive spacing                                                   |
| **11-Language i18n**             | Full UI and guide content localized in EN, ES, FR, DE, IT, PT, JA, KO, RU, ZHS, ZHT                        |

---

## 🚀 Quickstart

**Requires:** Node.js 20.11+ (see `.nvmrc`)

```bash
npm install
cp .env.example .env
npm run dev
```

---

## 📊 Built for Production

OffMeta includes enterprise-grade features:

- **Security**: 300+ security tests covering input sanitization, injection prevention, and rate limiting
- **E2E Coverage**: Stable Playwright smoke checks run on PRs/main; the full suite runs nightly or by manual workflow dispatch while full-suite flakiness is tracked in [GitHub issue #190](https://github.com/vermosi/offmeta/issues/190)
- **Accessibility Coverage**: A homepage axe smoke audit runs on PRs/main; the full axe-core Playwright suite runs nightly or by manual workflow dispatch
- **Rate Limiting**: Server and client-side throttling with abuse prevention
- **CORS Protection**: Origin allowlist enforcement with proper security headers
- **Error Sanitization**: Prevents leaking file paths, stack traces, and credentials
- **Offline-First PWA**: Service worker with intelligent caching strategies

Run security tests:

```bash
npm run test -- src/lib/security
```

This project uses npm only; `package-lock.json` is the sole dependency lockfile source.

Run E2E and accessibility tests:

```bash
npx playwright test --project=chromium --grep @e2e-smoke
npx playwright test --project=chromium --grep @a11y-smoke
npx playwright test --project=chromium
npx playwright test --project=chromium --grep @a11y
```

---

## ⚙️ Configuration

| Variable                        | Required | Description                   |
| ------------------------------- | -------- | ----------------------------- |
| `VITE_SUPABASE_URL`             | Yes      | Supabase project URL          |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes      | Supabase anon/publishable key |

For Edge Function environment variables, see [`docs/configuration.md`](docs/configuration.md).

---

## 🏗️ How It Works

```mermaid
flowchart LR
  UI["UI (text/voice)"] --> Edge["Supabase Edge Function"]
  Edge --> Translate["Deterministic translation"]
  Translate -->|fallback| AI["AI interpretation"]
  Translate --> Scryfall["Scryfall API"]
  AI --> Scryfall
  Scryfall --> Results["Results + metadata"]
  Results --> UI
  UI --> Cache["Client cache"]
```

1. You enter a natural-language query (text or voice)
2. The frontend sends the request to a Supabase Edge Function
3. The Edge Function deterministically translates the prompt to Scryfall syntax (AI is fallback only)
4. Results are fetched from Scryfall API, cached, and rendered

For architecture details, see [`docs/architecture.md`](docs/architecture.md).

---

## 🎯 Example Queries

Try these searches:

- `"artifact that produces 2 mana and costs four or less"`
- `"red or black creature that costs at least 5 mana and draws cards"`
- `"equipment which costs 3 and equips for 2"`
- `"green cards that let you sacrifice lands"`
- `"cards with cows in the art"`
- `"commanders with more than one color, one of which is blue"`

---

## 📖 Search Guides

OffMeta includes 10 progressive guides that teach natural language card search from beginner to expert:

| Level | Guide                   | Example Query                                     |
| ----- | ----------------------- | ------------------------------------------------- |
| 1     | Search by Creature Type | `"dragons"`                                       |
| 2     | Filter by Color         | `"mono red creatures"`                            |
| 3     | Budget & Price Filters  | `"budget board wipes under $5"`                   |
| 4     | Format Legality Search  | `"commander staples under $3"`                    |
| 5     | Keyword Ability Search  | `"creatures with flying and deathtouch"`          |
| 6     | Ramp & Card Draw        | `"green ramp spells that search for lands"`       |
| 7     | Tribal Synergies        | `"elf tribal payoffs for commander"`              |
| 8     | Token & Sacrifice       | `"creatures that make tokens when opponents act"` |
| 9     | ETB & Flicker Combos    | `"cards that double ETB effects"`                 |
| 10    | Multi-Constraint        | `"utility lands for commander in Esper under $5"` |

Browse all guides at [`/guides`](https://offmeta.app/guides).

---

## 📜 License (AGPL-3.0)

OffMeta is open source under the GNU AGPL v3. You are free to fork, modify, and self-host.

If you deploy a public instance (including hosted forks), you must make the corresponding source code available to users of that service, as required by the AGPL.

**Why AGPL?** We want improvements made to public deployments shared back with the community, instead of locked away in closed hosted clones.

Forks must rename the project and remove OffMeta branding when deployed publicly. See [TRADEMARK.md](TRADEMARK.md) for branding rules.

---

## 🤝 Contributing

Contributions are welcome! See [`CONTRIBUTING.md`](CONTRIBUTING.md) for setup, workflow, and checks.

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

Browse [GitHub Issues](https://github.com/vermosi/offmeta/issues) for current tasks.

---

## 💬 Community Discord

Join the OffMeta community on Discord to share ideas, get help, and discuss deckbuilding:

**Invite link:** [https://discord.com/invite/9UEv6vrTD4](https://discord.com/invite/9UEv6vrTD4)

---

## 🔒 Security

For security vulnerability reporting, see [SECURITY.md](SECURITY.md).

For the admin authorization model — `admin_api` schema, `SECURITY DEFINER` RPCs, the `admin-rpc` edge dispatcher, and the `admin-rpc-guard-tests` invariant suite — see [Admin RBAC in docs/security.md](docs/security.md#admin-rbac-security-definer--internal-publichas_roleadmin).

### Database functions vs edge functions

Use the right tool for the job:

- **Database functions (`SECURITY DEFINER` RPCs)** — for set-based work that stays inside Postgres: aggregations, joins across internal tables, trigger logic, and discovery helpers (e.g. `get_card_recommendations`, `get_signature_cards`, `get_price_movers`). Public helpers live in `public` and are callable from PostgREST. **Admin-only** RPCs live in the private `admin_api` schema, are granted to `service_role` only, and must call `public.has_role('admin')` as their first statement.
- **Edge functions** — for anything that needs network I/O, secrets, AI Gateway calls, third-party APIs, CORS-bound browser access, or request/response shaping (e.g. `semantic-search`, `fetch-moxfield-deck`, transactional email). Admin RPCs are reached **only** through the `admin-rpc` edge dispatcher, which validates the JWT, enforces `has_role('admin')`, and forwards to the whitelisted `admin_api.*` function with `service_role`.

Rule of thumb: if the work is pure SQL over our own tables → database function. If it touches the network, secrets, or untrusted input shaping → edge function. Never expose admin-gated logic via a `public` RPC or a direct `supabase.rpc(...)` call.

---

## 📚 Documentation

| Document                               | Description                                            |
| -------------------------------------- | ------------------------------------------------------ |
| [Architecture](docs/architecture.md)   | System design, data flow, and third-party integrations |
| [API](docs/api.md)                     | Edge function request/response contracts               |
| [Configuration](docs/configuration.md) | Environment variables and setup                        |
| [Development](docs/development.md)     | Local development guide                                |
| [Testing](docs/testing.md)             | Test suite documentation                               |
| [Guides](docs/guides.md)               | Search guides system documentation                     |
| [Roadmap](docs/roadmap.md)             | Planned features                                       |
| [FAQ](docs/FAQ.md)                     | Common questions                                       |
| [Internationalization](docs/i18n.md)   | i18n system and translation guide                      |
| [Security](docs/security.md)           | Admin RBAC, `admin_api` schema, guard-test runbook     |

---

## 📄 Legal

| Document                  | Description             |
| ------------------------- | ----------------------- |
| [LICENSE](LICENSE)        | AGPL-3.0 License        |
| [SECURITY](SECURITY.md)   | Vulnerability reporting |
| [TRADEMARK](TRADEMARK.md) | Branding guidelines     |
