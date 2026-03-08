import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotFound from '../NotFound';

vi.mock('@/lib/core/logger', () => ({
  logger: { error: vi.fn() },
}));

describe('NotFound', () => {
  it('renders 404 heading', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('renders "Page not found" message', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );
    expect(screen.getByText(/page not found/i)).toBeInTheDocument();
  });

  it('renders a link back to home', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );
    const link = screen.getByText(/back to home/i);
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toBe('/');
  });
});
