import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SystemStatusPanel } from '@/pages/admin-analytics/components/SystemStatusPanel';

const rpcMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

describe('SystemStatusPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses semantic status tokens for cron job statuses and failure badge', async () => {
    rpcMock.mockResolvedValue({
      data: {
        cronJobs: [
          {
            jobid: 1,
            jobname: 'sync_cards',
            schedule: '*/15 * * * *',
            last_status: 'succeeded',
            last_run_at: new Date().toISOString(),
            last_end_at: new Date().toISOString(),
            last_duration_s: 5,
            last_message: null,
            failures_24h: 0,
            runs_24h: 12,
          },
          {
            jobid: 2,
            jobname: 'sync_prices',
            schedule: '0 0 * * *',
            last_status: 'failed',
            last_run_at: new Date().toISOString(),
            last_end_at: new Date().toISOString(),
            last_duration_s: 8,
            last_message: 'boom',
            failures_24h: 2,
            runs_24h: 10,
          },
        ],
        dataFreshness: {},
        serverTime: new Date().toISOString(),
      },
      error: null,
    });

    render(<SystemStatusPanel />);

    fireEvent.click(screen.getByRole('button', { name: /load status/i }));

    const okStatus = await screen.findByText('OK');
    const failedStatus = await screen.findByText('failed');
    const failBadge = await screen.findByText('2 fail');

    expect(okStatus).toHaveClass('text-success');
    expect(failedStatus).toHaveClass('text-destructive');
    expect(failBadge).toHaveClass('text-destructive');

    expect(okStatus.className).not.toMatch(
      /text-emerald-600|dark:text-emerald-400/,
    );
    expect(failedStatus.className).not.toMatch(
      /text-red-600|dark:text-red-400/,
    );
    expect(failBadge.className).not.toMatch(/text-red-600|dark:text-red-400/);
  });

  it('uses semantic status tokens in data freshness rows', async () => {
    rpcMock.mockResolvedValue({
      data: {
        cronJobs: [],
        dataFreshness: {
          cards: {
            count: 100,
            active: 80,
            pending: 5,
            latest: new Date().toISOString(),
          },
        },
        serverTime: new Date().toISOString(),
      },
      error: null,
    });

    render(<SystemStatusPanel />);

    fireEvent.click(screen.getByRole('button', { name: /load status/i }));

    await waitFor(() => {
      expect(screen.getByText('80 active')).toBeInTheDocument();
      expect(screen.getByText('5 pending')).toBeInTheDocument();
    });

    const activeLabel = screen.getByText('80 active');
    const pendingLabel = screen.getByText('5 pending');

    expect(activeLabel).toHaveClass('text-success');
    expect(pendingLabel).toHaveClass('text-warning');

    expect(activeLabel.className).not.toMatch(
      /text-emerald-600|dark:text-emerald-400/,
    );
    expect(pendingLabel.className).not.toMatch(
      /text-amber-600|dark:text-amber-400/,
    );
  });
});
