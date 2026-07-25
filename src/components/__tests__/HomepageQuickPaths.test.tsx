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
        name: /start with a search turn a deck idea into real cards and refinements\./i,
      }),
    ).toHaveAttribute('href', '/search/commander%20ramp');
    expect(
      screen.getByRole('link', {
        name: /learn the basics browse focused guides and syntax examples\./i,
      }),
    ).toHaveAttribute('href', '/guides');
    expect(
      screen.getByRole('link', {
        name: /reopen saved work pick up recurring searches and workflows fast\./i,
      }),
    ).toHaveAttribute('href', '/saved');
    expect(
      screen.getByRole('link', {
        name: /track prices see market movers and card trends at a glance\./i,
      }),
    ).toHaveAttribute('href', '/market');
  });
});
