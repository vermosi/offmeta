# AGENTS Instructions

## Coding Conventions

- **Language**: TypeScript everywhere. No `any` unless unavoidable.
- **Naming**: `camelCase` for variables/functions, `PascalCase` for components/types, `SCREAMING_SNAKE_CASE` for constants.
- **Components**: Small, focused. Extract hooks when a component exceeds ~400 lines.
- **Styling**: Tailwind semantic tokens only (`text-foreground`, `bg-card`, etc.). Never raw colors (`text-white`, `bg-black`).
- **Imports**: Use `@/` path alias. Group: external → internal → types.

## Architecture

See `docs/architecture.md` for full details. Key modules:

- `src/lib/search/` — Deterministic + AI search pipeline (client-side)
- `supabase/functions/semantic-search/` — Edge function translation engine
- `src/hooks/useDeck*.ts` — Deck CRUD, undo/redo, keyboard shortcuts
- `src/components/deckbuilder/` — Deck editor UI components
- `src/lib/security/` — Reusable security utilities

## Running Tests

```bash
bun run test              # All tests
bun run test -- --watch   # Watch mode
bun run test -- src/lib/security  # Security suite only
```

## PR Checklist

- [ ] All tests pass (`bun run test`)
- [ ] No `any` types introduced
- [ ] RLS policies reviewed if DB changes
- [ ] Semantic tokens used (no raw colors)
- [ ] Edge functions include CORS headers
- [ ] Error states handled gracefully

## Prefer small, focused changes with clear commit messages.
