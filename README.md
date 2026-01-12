# OffMeta

[![CI](https://github.com/offmeta/offmeta/actions/workflows/ci.yml/badge.svg)](https://github.com/offmeta/offmeta/actions/workflows/ci.yml)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

OffMeta is a natural-language Magic: The Gathering search experience. It translates plain-English queries into precise Scryfall syntax so players can find cards without memorizing query operators.

**Live demo:** https://offmeta.app (official instance operated by OffMeta via Lovable)

## Features
- Natural-language search with deterministic translation and AI fallback.
- Voice input for hands-free searching.
- Card detail modal with rulings, prices, and printings.
- Client-side caching and Scryfall rate limiting.
- Dark/light theme support.

## Quickstart
**Requires:** Node.js 20.11+ (see `.nvmrc`)
```bash
npm install
cp .env.example .env
npm run dev
```

## Configuration
| Variable | Required | Description |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL used by the frontend client. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon/publishable key. |

For Edge Function environment variables, see [`docs/configuration.md`](docs/configuration.md).

## Usage examples
Try these sample queries:
1. "artifact that produced 2 mana and costs four or less mana"
2. "red or black creature that costs at least 5 mana and will draw cards"
3. "equipment which costs 3 and equip for 2"
4. "released after 2020"
5. "fits into a BR commander deck"
6. "rakdos creature"
7. "green cards that let you sacrifice lands"
8. "cards with cows in the art"
9. "creatures that care about graveyard order"
10. "commanders with more than one color, one of which is blue"

## Open source license (AGPL-3.0)
OffMeta is open source under the GNU AGPL v3. You are free to fork, modify, and self-host the project.

If you deploy a public instance (including hosted forks), you must make the corresponding source code available to users of that service, as required by the AGPL.

The official hosted version is run by OffMeta via Lovable. Forks must rename the project and remove OffMeta branding when deployed publicly. See [TRADEMARK.md](TRADEMARK.md) for branding rules.

### Why AGPL?
We want the project to stay open even when it’s hosted as a service. AGPL ensures that improvements made to public deployments are shared back with the community, instead of being locked away in closed hosted clones.

## Deployment and secrets
This repository does **not** include production credentials. Real environment files are ignored by Git and must be provided by operators.

Lovable deployment details are intentionally excluded to avoid leaking operational configuration. Use the `.env.example` template to configure your own instance.

## Troubleshooting
- **Missing environment variables**: Ensure `.env` is populated and matches `.env.example`.
- **No search results**: Check the `Search Interpretation` panel to confirm the generated Scryfall syntax.
- **AI gateway unavailable**: The app will fall back to deterministic rules; results may be less precise.

## Contributing
See [`CONTRIBUTING.md`](CONTRIBUTING.md) for setup, workflow, and checks.

## License
GNU AGPL v3. See [`LICENSE`](LICENSE).

## Security
Report vulnerabilities privately. See [`SECURITY.md`](SECURITY.md).
