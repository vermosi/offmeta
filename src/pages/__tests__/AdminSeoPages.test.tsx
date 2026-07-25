import type {
  ButtonHTMLAttributes,
  ReactNode,
  InputHTMLAttributes,
} from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminSeoPages from '@/pages/AdminSeoPages';
import type * as ReactRouterDom from 'react-router-dom';

const queryState = vi.hoisted(() => ({
  data: [] as Array<{
    id: string;
    query: string;
    slug: string;
    status: string;
    content_json: {
      tldr: string;
      cards?: Array<{ name: string }>;
      faqs?: Array<{ question: string }>;
    };
    created_at: string;
    published_at: string | null;
    updated_at: string;
  }>,
  isLoading: false,
  error: null as Error | null,
}));

const mutateMock = vi.fn();
const refetchMock = vi.fn();

vi.mock('@/hooks', () => ({
  useAuth: () => ({ user: { id: 'admin' } }),
  useUserRole: () => ({ hasRole: true, isLoading: false }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: vi.fn() },
  },
}));

vi.mock('@/components/Header', () => ({
  Header: () => <div data-testid="header" />,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouterDom>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: queryState.data,
    isLoading: queryState.isLoading,
    error: queryState.error,
    refetch: refetchMock,
  }),
  useMutation: () => ({ mutate: mutateMock, isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

describe('AdminSeoPages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryState.data = [];
    queryState.isLoading = false;
    queryState.error = null;
  });

  it('shows a friendly empty state when no SEO pages exist', () => {
    render(<AdminSeoPages />);

    expect(
      screen.getByText(/No SEO pages have been generated yet/i),
    ).toBeInTheDocument();
  });

  it('surfaces a retryable error when loading pages fails', () => {
    queryState.error = new Error('load failed');

    render(<AdminSeoPages />);

    expect(screen.getByText(/Failed to load SEO pages/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
