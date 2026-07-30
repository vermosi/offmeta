import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HeroSection } from '../HeroSection';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

describe('HeroSection', () => {
  it('renders the primary search prompt and hint', () => {
    render(
      <MemoryRouter>
        <HeroSection />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', {
        name: /search magic cards without learning scryfall syntax/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /start searching/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/budget board wipes under \$5/i),
    ).toBeInTheDocument();
  });
});
