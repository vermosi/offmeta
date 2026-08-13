import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomepageQuickPaths } from '../HomepageQuickPaths';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

describe('HomepageQuickPaths', () => {
  it('renders the primary entry points for new visitors', () => {
    render(
      <MemoryRouter>
        <HomepageQuickPaths />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'Choose your path into OffMeta' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: /start with a search/i,
      }),
    ).toHaveAttribute('href', '/search/commander%20ramp');
    expect(
      screen.getByRole('link', {
        name: /cards like x/i,
      }),
    ).toHaveAttribute('href', '/guides/cards-like-x');
  });
});

