import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
} from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import OAuthConsent from '@/pages/OAuthConsent';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signInWithPassword: vi.fn(),
  signInWithOAuth: vi.fn(),
  getAuthorizationDetails: vi.fn(),
  approveAuthorization: vi.fn(),
  denyAuthorization: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mocks.getSession(...args),
      signInWithPassword: (...args: unknown[]) =>
        mocks.signInWithPassword(...args),
      signInWithOAuth: (...args: unknown[]) => mocks.signInWithOAuth(...args),
      oauth: {
        getAuthorizationDetails: (...args: unknown[]) =>
          mocks.getAuthorizationDetails(...args),
        approveAuthorization: (...args: unknown[]) =>
          mocks.approveAuthorization(...args),
        denyAuthorization: (...args: unknown[]) =>
          mocks.denyAuthorization(...args),
      },
    },
  },
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    asChild,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) =>
    asChild ? <>{children}</> : <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: LabelHTMLAttributes<HTMLLabelElement>) => (
    <label {...props}>{children}</label>
  ),
}));

describe('OAuthConsent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    mocks.signInWithPassword.mockResolvedValue({ error: null });
    mocks.signInWithOAuth.mockResolvedValue({ error: null });
    mocks.getAuthorizationDetails.mockResolvedValue({
      data: null,
      error: null,
    });
  });

  function renderConsent(search = '?authorization_id=abc123') {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/.lovable/oauth/consent${search}`]}>
          <Routes>
            <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it('shows sign-in recovery links when the user is not authenticated', async () => {
    renderConsent();

    expect(
      await screen.findByText(/Sign in to authorize this MCP client/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /back to offmeta/i }),
    ).toHaveAttribute('href', '/');
  });

  it('surfaces requested scopes and a return link for authenticated users', async () => {
    mocks.getSession.mockResolvedValueOnce({
      data: { session: { user: { id: 'u1' } } },
    });
    mocks.getAuthorizationDetails.mockResolvedValueOnce({
      data: {
        client: { name: 'Claude', client_uri: 'https://example.com' },
        scope: 'search read:decks',
      },
      error: null,
    });

    renderConsent();

    await waitFor(() => {
      expect(screen.getByText(/Claude/i)).toBeInTheDocument();
    });
    expect(screen.getByText('search')).toBeInTheDocument();
    expect(screen.getByText('read:decks')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /return to offmeta/i }),
    ).toHaveAttribute('href', '/');
  });

  it('shows a retryable error if authorization details fail to load', async () => {
    mocks.getSession.mockResolvedValueOnce({
      data: { session: { user: { id: 'u1' } } },
    });
    mocks.getAuthorizationDetails.mockResolvedValueOnce({
      data: null,
      error: { message: 'details failed' },
    });

    renderConsent();

    expect(await screen.findByText(/details failed/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
