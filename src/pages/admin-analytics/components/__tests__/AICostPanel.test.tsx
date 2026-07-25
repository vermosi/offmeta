import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AICostPanel } from '@/pages/admin-analytics/components/AICostPanel';

const invokeMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => invokeMock(...args),
    },
  },
}));

describe('AICostPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows an empty state when no usage data is available', async () => {
    invokeMock.mockResolvedValueOnce({
      data: {
        data: {
          summary: {
            total_requests: 0,
            total_tokens: 0,
            total_prompt_tokens: 0,
            total_completion_tokens: 0,
            avg_duration_ms: 0,
            total_retries: 0,
          },
          byModel: [],
          byFunction: [],
          daily: [],
        },
      },
      error: null,
    });

    render(<AICostPanel days={7} />);

    await screen.findByText(/No model data/i);
    expect(screen.getByText(/No function data/i)).toBeInTheDocument();
  });

  it('surfaces an error and retry control when the request fails', async () => {
    invokeMock
      .mockRejectedValueOnce(new Error('rpc unavailable'))
      .mockResolvedValueOnce({
        data: {
          data: {
            summary: {
              total_requests: 1,
              total_tokens: 42,
              total_prompt_tokens: 21,
              total_completion_tokens: 21,
              avg_duration_ms: 120,
              total_retries: 0,
            },
            byModel: [],
            byFunction: [],
            daily: [],
          },
        },
        error: null,
      });

    render(<AICostPanel days={3} />);

    expect(await screen.findByText(/rpc unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Degraded/i)).toBeInTheDocument();
    });
  });
});
