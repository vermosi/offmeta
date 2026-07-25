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

Use npm only. `package-lock.json` is the sole dependency lockfile source; do not commit Bun lockfiles.

```bash
npm run test                    # All tests (canonical)
npm run test:watch              # Watch mode (canonical)
npm run test -- src/lib/security # Security suite only (canonical)
```

## PR Checklist

- [ ] All tests pass (`npm run test`)
- [ ] No `any` types introduced
- [ ] RLS policies reviewed if DB changes
- [ ] Semantic tokens used (no raw colors)
- [ ] Edge functions include CORS headers
- [ ] Error states handled gracefully

## Prefer small, focused changes with clear commit messages.

## Autonomous Improvement Mode

When assigned an autonomous improvement task, do not interpret completion of one feature, fix, test, or commit as completion of the overall assignment.

Continue selecting and completing work from `docs/autonomous-improvement-backlog.md` until the current task’s explicit iteration target is met, the execution environment ends the turn, or all safe and meaningful work is exhausted.

After each completed improvement:

- Verify the change.
- Commit it separately when appropriate.
- Update the backlog.
- Select the next highest-impact unblocked item.
- Continue without requesting approval.

Never end an autonomous improvement task with “let me know if you want me to continue.” Continue automatically.

Passing checks and creating a commit are checkpoints, not stopping conditions.

Do not make superficial changes to simulate progress. Every iteration must have a clear user, business, reliability, security, performance, accessibility, or maintainability benefit.
