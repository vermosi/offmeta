import type {
  ButtonHTMLAttributes,
  ReactNode,
  InputHTMLAttributes,
} from 'react';
import type * as ReactRouterDom from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminCuratedSearches from '@/pages/AdminCuratedSearches';

const queryState = vi.hoisted(() => ({
  rows: [] as Array<{
    id: string;
    slug: string;
    title: string;
    description: string;
    scryfall_query: string;
    natural_query: string;
    category: string;
    source: string;
    priority: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }>,
  error: null as Error | null,
}));

vi.mock('@/hooks', () => ({
  useAuth: () => ({ user: { id: 'admin' }, isLoading: false }),
  useUserRole: () => ({ hasRole: true, isLoading: false }),
}));

vi.mock('@/components/Header', () => ({
  Header: () => <header data-testid="header" />,
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

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => (
    <div data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SelectValue: () => <span />,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouterDom>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    Link: ({ children, ...props }: { children: ReactNode; to: string }) => (
      <a href={props.to}>{children}</a>
    ),
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: async () => {
          if (queryState.error) {
            return { data: null, error: queryState.error };
          }
          return { data: queryState.rows, error: null };
        },
      }),
      update: vi.fn(),
      delete: vi.fn(),
      insert: vi.fn(),
    }),
  },
}));

describe('AdminCuratedSearches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryState.rows = [];
    queryState.error = null;
  });

  it('shows a friendly empty state when no curated searches exist', async () => {
    render(<AdminCuratedSearches />);

    expect(
      await screen.findByText(/No curated searches have been created yet/i),
    ).toBeInTheDocument();
  });

  it('surfaces a retryable error when loading curated searches fails', async () => {
    queryState.error = new Error('load failed');

    render(<AdminCuratedSearches />);

    expect(
      await screen.findByText(/Failed to load curated searches/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
