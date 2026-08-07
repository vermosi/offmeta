import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EditableQueryBar } from '@/components/EditableQueryBar';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

describe('EditableQueryBar', () => {
  it('renders the editable Scryfall query', () => {
    render(
      <EditableQueryBar
        scryfallQuery='o:"treasure"'
        confidence={0.95}
        onRerun={vi.fn()}
      />,
    );

    expect(screen.getByRole('textbox', { name: 'Scryfall query' })).toHaveValue(
      'o:"treasure"',
    );
  });
});
