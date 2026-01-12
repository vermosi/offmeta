# Style Guide

## Code conventions
- Prefer small, focused components.
- Keep hooks in `src/hooks` and pure utilities in `src/lib`.
- Use named exports for shared utilities.
- Avoid `any` unless absolutely necessary.

## Formatting
- Prettier is the source of truth.
- Run `npm run format` before opening a PR.

## Testing
- Favor table-driven tests for query translation.
- Add regression tests for any bug fix.
