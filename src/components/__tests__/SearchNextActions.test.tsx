import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SearchNextActions } from '@/components/SearchNextActions';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock('@/hooks/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: vi.fn(),
  }),
}));

describe('SearchNextActions', () => {
  it('shows a primary next step and a quieter fallback', () => {
    render(
      <MemoryRouter>
        <SearchNextActions
          intent={null}
          originalQuery="cards that protect my commander"
          totalCards={120}
          isDeckQuery={true}
          queryQualityScore={0.82}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/next step/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /combos/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /guides/i })).toBeInTheDocument();
  });
});
