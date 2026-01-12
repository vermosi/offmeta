# Development

## Local setup
```bash
npm install
cp .env.example .env
npm run dev
```

## Available scripts
- `npm run dev` — start the Vite dev server
- `npm run build` — build production assets
- `npm run start` — preview the production build
- `npm run lint` — run ESLint
- `npm run format` — run Prettier
- `npm run format:check` — verify formatting
- `npm run typecheck` — run TypeScript checks
- `npm run test` — run unit tests
- `npm run test:watch` — watch mode
- `npm run check` — lint + typecheck + test

## Project structure
- `src/` — frontend application
- `supabase/functions/` — Edge Functions
- `docs/` — extended documentation
