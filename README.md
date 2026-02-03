# OffMeta

[![CI](https://github.com/vermosi/offmeta/actions/workflows/ci.yml/badge.svg)](https://github.com/vermosi/offmeta/actions/workflows/ci.yml)
[![Live Demo](https://img.shields.io/badge/Demo-offmeta.lovable.app-22c55e?style=flat-square)](https://offmeta.lovable.app)
[![License](https://img.shields.io/github/license/vermosi/offmeta?style=flat-square)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/vermosi/offmeta?style=social)](https://github.com/vermosi/offmeta)

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white&style=flat-square)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white&style=flat-square)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white&style=flat-square)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white&style=flat-square)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/tests-600%2B-brightgreen?style=flat-square)](docs/testing.md)
[![Built with Lovable](https://img.shields.io/badge/Built%20with-Lovable-ff69b4?style=flat-square)](https://lovable.dev)

**Natural language search for Magic: The Gathering cards, powered by Scryfall.**

> _Describe what you're looking for in plain English. No complex syntax. No guessing. Just natural conversation._

**Live demo:** [offmeta.lovable.app](https://offmeta.lovable.app)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Natural Language Search** | Describe cards in plain English — AI translates to Scryfall syntax |
| **200+ Deterministic Patterns** | Fast, cached translations for common queries without AI calls |
| **Voice Input** | Hands-free searching with speech recognition |
| **Card Details** | Rulings, prices, printings, and legality in a clean modal |
| **Client-Side Caching** | Sub-100ms response for repeated queries |
| **PWA Support** | Installable with offline-first architecture |
| **Dark/Light Theme** | Automatic system preference detection |

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
- **Rate Limiting**: Server and client-side throttling with abuse prevention
- **CORS Protection**: Origin allowlist enforcement with proper security headers
- **Error Sanitization**: Prevents leaking file paths, stack traces, and credentials
- **Offline-First PWA**: Service worker with intelligent caching strategies

Run security tests:
```bash
npm run test -- src/lib/security
```

---

## ⚙️ Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon/publishable key |

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

## 🔒 Security

For security vulnerability reporting, see [SECURITY.md](SECURITY.md).

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | System design and data flow |
| [Configuration](docs/configuration.md) | Environment variables and setup |
| [Development](docs/development.md) | Local development guide |
| [Testing](docs/testing.md) | Test suite documentation |
| [Roadmap](docs/roadmap.md) | Planned features |
| [FAQ](docs/FAQ.md) | Common questions |

---

## 📄 Legal

| Document | Description |
|----------|-------------|
| [LICENSE](LICENSE) | AGPL-3.0 License |
| [SECURITY](SECURITY.md) | Vulnerability reporting |
| [TRADEMARK](TRADEMARK.md) | Branding guidelines |
