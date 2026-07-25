import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ResetPassword from '@/pages/ResetPassword';

vi.mock('@/hooks', () => ({
  useAuth: () => ({
    updatePassword: vi.fn(),
    session: null,
  }),
}));

vi.mock('@/components/Header', () => ({
  Header: () => <div data-testid="header" />,
}));

vi.mock('@/components/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

vi.mock('@/components/SkipLinks', () => ({
  SkipLinks: () => null,
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('ResetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows recovery guidance when the link is invalid', () => {
    window.location.hash = '';

    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>,
    );

    expect(
      screen.getByText(/This password reset link is missing recovery context/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /go to offmeta/i }),
    ).toHaveAttribute('href', '/');
  });
});
