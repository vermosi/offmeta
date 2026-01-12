# OffMeta - Natural Language MTG Card Search

[![Live Demo](https://img.shields.io/badge/Demo-offmeta.app-22c55e?style=for-the-badge)](https://offmeta.app)

[![Proprietary License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Built with Lovable](https://img.shields.io/badge/Built%20with-Lovable-ff69b4)](https://lovable.dev)

A Magic: The Gathering card search application powered by AI-driven natural language processing. Search for cards using plain English descriptions instead of complex query syntax.

## Features

- **Natural Language Search**: Describe what you're looking for in plain English (e.g., "cards that draw when creatures die")
- **AI-Powered Query Translation**: Uses Gemini AI to convert natural language into Scryfall search syntax
- **Voice Input**: Speak your searches using the built-in voice recognition
- **Card Details Modal**: View full card information, prices, and printings
- **Dark/Light Theme**: Toggle between themes for comfortable viewing
- **Mobile Responsive**: Works seamlessly on desktop and mobile devices

---

## Project Structure

```
src/
├── components/          # React components
├── hooks/               # Custom React hooks
├── lib/                 # Utility functions and API clients
├── pages/               # Page components (routes)
├── types/               # TypeScript type definitions
└── integrations/        # External service integrations

supabase/
└── functions/           # Edge functions for backend logic
    ├── semantic-search/ # AI-powered query translation
    ├── generate-patterns/ # Auto-generate translation rules from logs
    ├── process-feedback/  # Process user feedback into rules
    └── cleanup-logs/      # Clean up old translation logs
```

---

## Core Components

### Pages

| File | Description |
|------|-------------|
| `pages/Index.tsx` | Main search page. Handles search state, pagination, displays card grid, and manages the card modal. |
| `pages/NotFound.tsx` | 404 error page for invalid routes. |

### Search Components

| File | Description |
|------|-------------|
| `components/UnifiedSearchBar.tsx` | Main search input with natural language support. Handles query submission, search history, client-side caching, and integrates voice input. |
| `components/SearchInterpretation.tsx` | Displays how the AI interpreted the natural language query and the resulting Scryfall syntax. |
| `components/SearchFeedback.tsx` | Allows users to report incorrect translations, feeding into the learning system. |
| `components/VoiceSearchButton.tsx` | Microphone button for voice-to-text search input. |

### Card Display Components

| File | Description |
|------|-------------|
| `components/CardItem.tsx` | Individual card preview in the search results grid. Shows card image with hover effects. |
| `components/CardModal.tsx` | Full card details modal/drawer. Displays card image, oracle text, prices, legalities, and links to purchase. Uses `Dialog` on desktop and `Drawer` on mobile. |
| `components/ManaSymbol.tsx` | Renders mana symbols and mana costs. Converts mana notation like `{W}{U}{B}` into visual icons. |

### Layout Components

| File | Description |
|------|-------------|
| `components/Footer.tsx` | Site footer with links and credits. |
| `components/ThemeToggle.tsx` | Dark/light mode toggle button. |
| `components/AffiliateNotice.tsx` | Disclosure notice shown when search indicates purchase intent. |

---

## Hooks

| File | Description |
|------|-------------|
| `hooks/use-mobile.tsx` | Detects mobile viewport for responsive behavior. Returns `isMobile` boolean. |
| `hooks/use-toast.ts` | Toast notification system hook. |
| `hooks/useVoiceInput.ts` | Web Speech API integration for voice-to-text input. Handles recording state and transcription. |
| `hooks/useAnalytics.ts` | Analytics event tracking for search and card interactions. |

---

## Library / Utilities

| File | Description |
|------|-------------|
| `lib/scryfall.ts` | Scryfall API client. Handles card search, pagination, image URLs, and rulings. Enforces rate limiting per Scryfall guidelines. |
| `lib/card-printings.ts` | Fetches all printings of a card from Scryfall. Generates TCGPlayer and Cardmarket purchase URLs. |
| `lib/utils.ts` | General utilities including `cn()` for className merging (Tailwind). |

---

## Backend (Edge Functions)

### `supabase/functions/semantic-search/index.ts`

The AI-powered search translation service with multi-layer cost optimization.

**Translation Pipeline:**
1. **In-Memory Cache**: Instant lookup for recently translated queries (30 min TTL)
2. **Persistent DB Cache**: Survives function restarts (48 hour TTL, confidence ≥ 0.8)
3. **Pattern Matching**: Exact match against `translation_rules` table (bypasses AI)
4. **Prompt Tiering**: Simple/medium/complex queries use progressively larger prompts
5. **AI Translation**: Gemini AI with comprehensive MTG terminology prompt
6. **Auto-Correction**: Fixes common AI mistakes (invalid tags, verbose syntax)
7. **Fallback Transformer**: 100+ regex patterns for when AI is unavailable

**Key Features:**
- Rate limiting (30 req/min per IP, 1000 req/min global)
- Circuit breaker for AI service failures
- Synonym normalization for better cache hit rates
- Quality flag detection and logging
- Selective logging (only logs issues, not successful translations)

**Cost Optimization:**
- ~60-70% of queries bypass AI via caching/patterns
- Simple queries use ~300 token prompts vs ~1500 for complex
- Estimated cost: ~$3-4/month at 100k searches

### How parsing works

The semantic search function applies a deterministic rules layer before any AI translation:

1. **Normalize input**: lowercases, trims whitespace, standardizes quotes, and normalizes MTG synonyms (`cmc` → `mv`, `color identity` → `ci`).
2. **Extract a Search IR**: captures colors, types, numeric constraints, oracle patterns, tags, and special fields in a structured object.
3. **Render Scryfall syntax**: the final deterministic query string is always generated from the IR (not directly from LLM output).
4. **LLM fallback (validated)**: remaining free-text concepts are translated and then validated/relaxed if necessary before execution.

### Color/identity rules

OffMeta follows deterministic color semantics to avoid overly-broad queries:

- **“red or black”** → `(c=r or c=b)` (color OR, not gold-only)
- **“red and black” / “rakdos”** → `c=br` (both colors)
- **“fits into a BR commander deck”** → `ci<=br`
- **“exactly rakdos color identity” / “only BR”** → `ci=br`
- **“mono red”** → `c=r ci=r`

### `supabase/functions/generate-patterns/index.ts`

Automatically generates translation rules from frequently occurring queries in logs.

- Runs weekly via cron (Sunday 3 AM UTC)
- Identifies queries with 3+ occurrences and high confidence
- Creates new `translation_rules` entries for AI bypass

### `supabase/functions/process-feedback/index.ts`

Processes user-submitted feedback about incorrect translations.

- Uses AI to generate corrected Scryfall syntax
- Creates new translation rules from validated feedback
- Improves system accuracy over time

### `supabase/functions/cleanup-logs/index.ts`

Maintains database hygiene by cleaning up old logs.

- Runs weekly via cron
- Removes logs older than 30 days
- Keeps database size manageable

---

## Database Tables

| Table | Description |
|-------|-------------|
| `translation_rules` | Pattern → Scryfall mappings that bypass AI |
| `translation_logs` | Logged translations for quality analysis (low confidence, errors only) |
| `query_cache` | Persistent cache for high-confidence translations (48h TTL) |
| `search_feedback` | User-submitted feedback about incorrect translations |
| `analytics_events` | Search and interaction analytics |

---

## Types

| File | Description |
|------|-------------|
| `types/card.ts` | TypeScript interfaces for Scryfall card data (`ScryfallCard`, `ScryfallResponse`). |

---

## Data Flow

```
User Input (text/voice)
         │
         ▼
UnifiedSearchBar.tsx (client-side cache check)
         │
         ▼
semantic-search Edge Function
         │
         ├─► In-Memory Cache Hit? → Return cached
         │
         ├─► Persistent DB Cache Hit? → Return cached
         │
         ├─► Pattern Match Hit? → Return matched
         │
         ├─► Circuit Breaker Open? → Use fallback transformer
         │
         └─► AI Translation (tiered prompts)
                    │
                    ▼
            Auto-correction + Validation
                    │
                    ▼
            Cache result (memory + DB)
                    │
                    ▼
Scryfall API
         │
         ▼
Card Results → CardItem.tsx grid
         │
         ▼
CardModal.tsx (on click)
```

---

## Styling

- **Tailwind CSS**: All styling uses Tailwind utility classes
- **Design Tokens**: Colors defined in `src/index.css` as CSS variables, referenced in `tailwind.config.ts`
- **shadcn/ui**: UI primitives in `components/ui/` (Dialog, Drawer, Button, etc.)
- **Theming**: Dark/light mode via `next-themes`, toggle in ThemeToggle.tsx

---

## Configuration Files

| File | Description |
|------|-------------|
| `tailwind.config.ts` | Tailwind configuration with custom colors and animations |
| `vite.config.ts` | Vite bundler configuration |
| `supabase/config.toml` | Supabase project configuration (auto-managed) |
| `.env` | Environment variables for Supabase connection (auto-managed) |

---

## Key Technologies

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Accessible UI components
- **TanStack Query** - Data fetching and caching
- **Gemini AI** - Natural language processing (via Lovable AI gateway)
- **Scryfall API** - MTG card database
- **Supabase Edge Functions** - Serverless backend
- **PostgreSQL** - Database for caching, rules, and analytics

---

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

---

## Notes for Contributors

1. **Keep it simple**: This app focuses on search only. No auth, deck building, or collection features.
2. **Mobile-first**: Always test on mobile. Use `useIsMobile()` hook for responsive behavior.
3. **AI prompts**: The Gemini prompt in `semantic-search/index.ts` is critical for search quality. Test changes thoroughly.
4. **Scryfall syntax**: Reference [Scryfall's syntax guide](https://scryfall.com/docs/syntax) when updating the AI prompt.
5. **Cost optimization**: Prefer adding patterns to `translation_rules` over AI prompt changes for common queries.

---

## Legal

| Document | Description |
|----------|-------------|
| [LICENSE](LICENSE) | Proprietary license - All Rights Reserved |
| [SECURITY](SECURITY.md) | Security vulnerability reporting |
