import type * as ReactRouterDom from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProfileSettings from '@/pages/ProfileSettings';

const fromMock = vi.fn();

vi.mock('@/hooks', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'user@example.com' },
    isLoading: false,
    refreshProfile: vi.fn(),
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
    storage: {
      from: vi.fn(),
    },
  },
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

vi.mock('@/lib/i18n/useTranslation', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouterDom>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('ProfileSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: new Error('profile load failed'),
      }),
    });
  });

  it('shows a retryable error when profile loading fails', async () => {
    render(
      <MemoryRouter>
        <ProfileSettings />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText(/Failed to load your profile settings/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
