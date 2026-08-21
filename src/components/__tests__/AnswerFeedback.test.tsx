import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { FeedbackPayload } from '@/lib/feedback';
import type * as FeedbackModule from '@/lib/feedback';


const mockSubmitFeedback = vi.fn();
const mockTrackEvent = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('@/lib/feedback', async (importOriginal) => {
  const actual = await importOriginal<typeof FeedbackModule>();
  return {
    ...actual,
    submitFeedback: (payload: FeedbackPayload) => mockSubmitFeedback(payload),
  };
});


vi.mock('@/hooks/useAnalytics', () => ({
  useAnalytics: () => ({ trackEvent: mockTrackEvent }),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? '',
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

vi.mock('@/lib/core/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

import { AnswerFeedback } from '@/components/AnswerFeedback';

describe('AnswerFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubmitFeedback.mockResolvedValue(undefined);
  });

  it('renders thumbs up/down buttons initially', () => {
    render(<AnswerFeedback originalQuery="test query" scryfallQuery="t:creature" />);
    expect(screen.getByLabelText('Yes, these results helped')).toBeInTheDocument();
    expect(screen.getByLabelText('No, these results were wrong')).toBeInTheDocument();
  });

  it('collapses to a thanks message after a reason is chosen', async () => {
    render(<AnswerFeedback originalQuery="test query" scryfallQuery="t:creature" />);
    fireEvent.click(screen.getByLabelText('No, these results were wrong'));
    fireEvent.click(screen.getByRole('button', { name: 'Wrong results' }));

    await waitFor(() => {
      expect(screen.getByTestId('answer-feedback-thanks')).toBeInTheDocument();
    });
  });

  it('reverts to normal state when the details dialog is cancelled', async () => {
    render(<AnswerFeedback originalQuery="test query" scryfallQuery="t:creature" />);

    fireEvent.click(screen.getByLabelText('No, these results were wrong'));
    fireEvent.click(screen.getByRole('button', { name: 'Add details' }));

    await waitFor(() => {
      expect(screen.getByText('Report Search Issue')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByText('Report Search Issue')).not.toBeInTheDocument();
    });

    expect(screen.getByLabelText('Yes, these results helped')).toBeInTheDocument();
    expect(screen.getByLabelText('No, these results were wrong')).toBeInTheDocument();
    expect(screen.queryByTestId('answer-feedback-thanks')).not.toBeInTheDocument();
  });

  it('shows thanks after the details dialog is submitted', async () => {
    render(<AnswerFeedback originalQuery="test query" scryfallQuery="t:creature" />);

    fireEvent.click(screen.getByLabelText('No, these results were wrong'));
    fireEvent.click(screen.getByRole('button', { name: 'Add details' }));

    await waitFor(() => {
      expect(screen.getByText('Report Search Issue')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('What went wrong?'), {
      target: { value: 'It missed the best card.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit Report' }));

    await waitFor(() => {
      expect(screen.queryByText('Report Search Issue')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('answer-feedback-thanks')).toBeInTheDocument();
    });
  });
});
