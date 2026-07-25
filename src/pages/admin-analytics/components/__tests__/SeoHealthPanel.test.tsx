import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SeoHealthPanel } from '@/pages/admin-analytics/components/SeoHealthPanel';

const rpcMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

describe('SeoHealthPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the empty state when no checks have run yet', async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        last_run: null,
        latest_results: [],
        recent_failures: [],
      },
      error: null,
    });

    render(<SeoHealthPanel />);

    expect(
      await screen.findByText(/No SEO health checks have run yet/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/09:00 UTC/i)).toBeInTheDocument();
  });

  it('surfaces a loading state while the summary is fetching', async () => {
    rpcMock.mockImplementation(
      () =>
        new Promise(() => {
          // keep pending
        }),
    );

    const { container } = render(<SeoHealthPanel />);

    await waitFor(() => {
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  it('surfaces an error and allows retrying the request', async () => {
    rpcMock
      .mockRejectedValueOnce(new Error('network failed'))
      .mockResolvedValueOnce({
        data: {
          last_run: new Date().toISOString(),
          latest_results: [],
          recent_failures: [],
        },
        error: null,
      });

    render(<SeoHealthPanel />);

    expect(await screen.findByText(/network failed/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
