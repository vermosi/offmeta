import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { mockInsert, mockSelect, mockSingle, mockInvoke, mockTrackFeedback } =
  vi.hoisted(() => ({
    mockInsert: vi.fn(),
    mockSelect: vi.fn(),
    mockSingle: vi.fn(),
    mockInvoke: vi.fn(),
    mockTrackFeedback: vi.fn(),
  }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      insert: mockInsert,
      select: mockSelect,
      single: mockSingle,
    }),
    functions: {
      invoke: mockInvoke,
    },
  },
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? '',
  }),
}));

vi.mock('@/hooks/useAnalytics', () => ({
  useAnalytics: () => ({
    trackFeedback: mockTrackFeedback,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/core/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { ReportIssueDialog } from '@/components/ReportIssueDialog';

describe('ReportIssueDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      '11111111-1111-4111-8111-111111111111',
    );
    localStorage.clear();
  });

  it('submits feedback without select/single and triggers processing by generated id', async () => {
    render(
      <ReportIssueDialog
        open
        onOpenChange={vi.fn()}
        originalQuery="find draw spells"
        compiledQuery="otag:draw"
      />,
    );

    fireEvent.change(screen.getByLabelText('What went wrong?'), {
      target: {
        value: 'This query missed several cards with repeatable draw effects.',
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Submit Report' }));

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledTimes(1);
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '11111111-1111-4111-8111-111111111111',
        original_query: 'find draw spells',
        translated_query: 'otag:draw',
      }),
    );
    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockSingle).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('process-feedback', {
        body: { feedbackId: '11111111-1111-4111-8111-111111111111' },
      });
    });
  });
});
