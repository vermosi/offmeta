# Offmeta - Natural Language MTG Card Search

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
| `components/UnifiedSearchBar.tsx` | Main search input with natural language support. Handles query submission, search history, loading states, and integrates voice input. |
| `components/SearchInterpretation.tsx` | Displays how the AI interpreted the natural language query and the resulting Scryfall syntax. |
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

---

## Library / Utilities

| File | Description |
|------|-------------|
| `lib/scryfall.ts` | Scryfall API client. Contains `searchCards()` function that calls the semantic-search edge function for natural language queries, or falls back to direct Scryfall API for syntax queries. Handles pagination and card image URLs. |
| `lib/card-printings.ts` | Fetches all printings of a card from Scryfall. Generates TCGPlayer and Cardmarket purchase URLs. |
| `lib/utils.ts` | General utilities including `cn()` for className merging (Tailwind). |

---

## Backend (Edge Functions)

### `supabase/functions/semantic-search/index.ts`

The AI-powered search translation service. This is the core of the natural language processing.

**How it works:**
1. Receives a natural language query from the frontend
2. Sends the query to Gemini AI with a detailed prompt about Scryfall syntax
3. AI returns a structured response with:
   - `scryfallQuery`: The translated Scryfall search syntax
   - `explanation`: Human-readable explanation of the interpretation
   - `searchType`: Whether this is a card search, rules question, or purchase intent
4. Frontend uses the Scryfall query to fetch matching cards

**Key features:**
- Maintains conversation context for follow-up queries
- Handles MTG-specific terminology and slang
- Detects purchase intent for affiliate notices
- Returns structured JSON for reliable parsing

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
UnifiedSearchBar.tsx
        │
        ▼
searchCards() in lib/scryfall.ts
        │
        ▼
semantic-search Edge Function (Gemini AI)
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
- **Gemini AI** - Natural language processing (via Lovable Cloud)
- **Scryfall API** - MTG card database
- **Supabase Edge Functions** - Serverless backend

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
