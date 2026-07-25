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
  it('renders primary and secondary navigation links', () => {
    render(
      <MemoryRouter>
        <HeroSection />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('link', { name: 'Explore archetypes' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Learn syntax' })).toHaveAttribute(
      'href',
      '/docs/syntax',
    );
    expect(screen.getByRole('link', { name: 'Browse guides' })).toHaveAttribute(
      'href',
      '/guides',
    );
    expect(
      screen.getByRole('link', { name: 'Saved searches' }),
    ).toHaveAttribute('href', '/saved');
  });
});
