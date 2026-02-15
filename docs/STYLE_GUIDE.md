# Style Guide

## File Naming Conventions

Consistent file naming is enforced across the codebase:

| Category | Convention | Example |
|----------|------------|---------|
| React components | PascalCase | `CardModal.tsx`, `SearchFilters.tsx` |
| Hooks | camelCase with `use` prefix | `useSearchQuery.ts`, `useMobile.tsx` |
| Utilities/lib | kebab-case (preferred) | `card-printings.ts`, `query-filters.ts` |
| Types | kebab-case | `card.ts`, `filters.ts` |
| Tests | `*.test.ts` suffix | `utils.test.ts`, `CardModal.test.tsx` |
| Snapshot tests | `*.snapshot.test.ts` | `CardModal.snapshot.test.tsx` |
| UI components (shadcn) | kebab-case | `button.tsx`, `dialog.tsx` |
| Constants | SCREAMING_SNAKE_CASE (exports) | `SECURITY_LIMITS`, `API_ENDPOINTS` |

**Note:** The `src/lib/` folder uses kebab-case as the preferred convention, but ESLint enforcement is only applied to specific folders to avoid churn in existing files.

### Directory Structure

```
src/
├── components/           # PascalCase components
│   ├── CardModal.tsx
│   └── ui/              # kebab-case (shadcn convention)
│       └── button.tsx
├── hooks/               # camelCase with use prefix
│   └── useSearchQuery.ts
├── lib/                 # kebab-case utilities
│   ├── core/
│   ├── scryfall/
│   └── security/
├── pages/               # PascalCase
│   └── Index.tsx
└── types/               # kebab-case
    └── card.ts
```

## Code Conventions

- Prefer small, focused components.
- Keep hooks in `src/hooks` and pure utilities in `src/lib`.
- Use named exports for shared utilities.
- Avoid `any` unless absolutely necessary.
- Use `type` imports for type-only imports (`import type { X }`).

## Formatting

- Prettier is the source of truth.
- Run `npm run format` before opening a PR.
- Max line length: 100 characters.

## TypeScript

- Enable strict mode.
- Prefer interfaces for object shapes, types for unions/intersections.
- Use `unknown` instead of `any` for truly unknown types.
- Always define return types for exported functions.

## Testing

- Favor table-driven tests for query translation.
- Add regression tests for any bug fix.
- Security tests go in `src/lib/security/`.
- Use descriptive test names: `it('should reject SQL injection in query parameter')`.

## Imports

Order imports in this sequence (enforced by ESLint):
1. React and external packages
2. Internal aliases (`@/components`, `@/lib`, etc.)
3. Relative imports
4. Type imports

```typescript
import * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/core/utils';
import type { CardProps } from './types';
```

## Component Structure

```typescript
// 1. Imports
import * as React from 'react';

// 2. Types
interface ComponentProps {
  title: string;
  onAction?: () => void;
}

// 3. Component
export function Component({ title, onAction }: ComponentProps) {
  // 3a. Hooks
  const [state, setState] = React.useState(false);

  // 3b. Derived state
  const isReady = state && title;

  // 3c. Handlers
  const handleClick = () => {
    setState(true);
    onAction?.();
  };

  // 3d. Render
  return <button onClick={handleClick}>{title}</button>;
}
```

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Variables | camelCase | `cardList`, `isLoading` |
| Functions | camelCase | `fetchCards`, `handleSubmit` |
| Components | PascalCase | `CardModal`, `SearchBar` |
| Constants | SCREAMING_SNAKE | `MAX_RETRIES`, `API_URL` |
| Types/Interfaces | PascalCase | `CardProps`, `SearchResult` |
| Enums | PascalCase | `CardType`, `SortOrder` |
| CSS classes | kebab-case | `card-container`, `search-input` |
