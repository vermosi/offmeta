# OffMeta

[![CI](https://github.com/offmeta/offmeta/actions/workflows/ci.yml/badge.svg)](https://github.com/offmeta/offmeta/actions/workflows/ci.yml)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![GitHub stars](https://img.shields.io/github/stars/offmeta/offmeta?style=social)](https://github.com/offmeta/offmeta)

OffMeta is a natural-language search tool for Magic: The Gathering cards. It translates plain-English queries into Scryfall syntax, fetches card results, and shows how your query was interpreted so you can tweak it.

**Demo:** https://offmeta.app (placeholder)

## Features
- Natural-language query translation (deterministic + AI fallback)
- Editable compiled query bar (Scryfall syntax)
- Voice input for searches
- Client-side caching for repeated searches
- Supabase Edge Functions for translation and feedback

## Quickstart
```bash
npm install
cp .env.example .env
npm run dev
```

## Development scripts
- `npm run lint` — ESLint
- `npm run format` — Prettier formatting
- `npm run format:check` — verify formatting
- `npm run typecheck` — TypeScript checks
- `npm run test` — Vitest unit tests
- `npm run check` — lint + typecheck + tests

## Configuration

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL for the frontend client. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon/public key for the frontend client. |
| `SUPABASE_URL` | Yes | Supabase project URL for Edge Functions. |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon key for Edge Functions that need public access. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key for admin operations. |
| `LOVABLE_API_KEY` | Yes | API key for the AI translation service. |
| `RUN_QUERY_VALIDATION_CHECKS` | No | Set to `true` to run validation checks on function startup. |
| `LOG_ALL_TRANSLATIONS` | No | Set to `true` for verbose translation logging. |

Node.js 20.11+ is required (see `.nvmrc`).

## Usage examples
Try these example queries:
1. "artifact that produced 2 mana and costs four or less mana"
2. "red or black creature that costs at least 5 mana and will draw cards"
3. "equipment which costs 3 and equip for 2"
4. "released after 2020"
5. "fits into a BR commander deck"
6. "rakdos creature"
7. "mono red creatures with power 4 or greater"
8. "cheap green ramp spells"
9. "counterspells under 3 mana"
10. "cards that care about graveyard order"

## Troubleshooting
- **Missing env vars:** Ensure `.env` is created from `.env.example` and includes the Vite `VITE_` values.
- **Too many results:** Try adding card type, mana value, or color constraints.
- **Search timeouts:** The app will fall back to a direct Scryfall search if translation times out.

## Documentation
- [Architecture](docs/architecture.md)
- [Configuration](docs/configuration.md)
- [Development](docs/development.md)
- [Testing](docs/testing.md)
- [API](docs/api.md)
- [FAQ](docs/FAQ.md)
- [Roadmap](docs/roadmap.md)

## Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, checks, and style guidelines.

## License
This project is licensed under the MIT License. See [LICENSE](LICENSE).

## Security
Report vulnerabilities to security@offmeta.app. See [SECURITY.md](SECURITY.md).
