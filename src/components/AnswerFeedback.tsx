/**
 * Thumbs-up / thumbs-down rating for a search answer.
 *
 * Positive votes are recorded as analytics signals only. Negative votes reveal
 * quick reasons ("wrong results" / "incomplete") that are written straight into
 * `search_feedback` so the auto-repair pipeline can act on them, plus an
 * escalation path into the full report dialog for free-text detail.
 * @module components/AnswerFeedback
 */

import { useRef, useState, lazy, Suspense } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { useAnalytics } from '@/hooks';
import { submitFeedback } from '@/lib/feedback';
import { logger } from '@/lib/core/logger';
import { cn } from '@/lib/core/utils';
import type { FilterState } from '@/types/filters';

const ReportIssueDialog = lazy(() =>
  import('@/components/ReportIssueDialog').then((m) => ({
    default: m.ReportIssueDialog,
  })),
);

type Vote = 'up' | 'down' | null;
type Reason = 'wrong' | 'incomplete';

interface AnswerFeedbackProps {
  originalQuery: string;
  scryfallQuery: string;
  /** Translation confidence 0–1, attached to the signal for triage. */
  confidence?: number | null;
  resultCount?: number;
  requestId?: string;
  filters?: FilterState | null;
  className?: string;
}

export function AnswerFeedback({
  originalQuery,
  scryfallQuery,
  confidence,
  resultCount,
  requestId,
  filters,
  className,
}: AnswerFeedbackProps) {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const [vote, setVote] = useState<Vote>(null);
  const [submitted, setSubmitted] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState(false);

  if (!originalQuery.trim()) return null;

  const signalContext = {
    query: originalQuery,
    scryfall_query: scryfallQuery,
    confidence: typeof confidence === 'number' ? confidence : undefined,
    result_count: resultCount,
    request_id: requestId,
  };

  const handleUp = () => {
    setVote('up');
    setSubmitted(true);
    trackEvent('answer_feedback', { ...signalContext, sentiment: 'up' });
  };

  const handleDown = () => {
    setVote('down');
    trackEvent('answer_feedback', { ...signalContext, sentiment: 'down' });
  };

  const handleReason = async (reason: Reason) => {
    if (pending) return;
    setPending(true);
    const description =
      reason === 'wrong'
        ? `[thumbs_down:wrong] Results do not match the request "${originalQuery}".`
        : `[thumbs_down:incomplete] Results are incomplete or missing obvious cards for "${originalQuery}".`;

    try {
      await submitFeedback({
        originalQuery,
        translatedQuery: scryfallQuery || null,
        issueDescription: description,
        requestId,
        surface: 'search_answer_rating',
      });
      trackEvent('feedback_submitted', {
        ...signalContext,
        sentiment: 'down',
        reason,
      });
      setSubmitted(true);
      toast.success(t('feedback.submitted', 'Feedback submitted'), {
        description: t(
          'feedback.thanks',
          "Thanks! We'll use this to improve searches.",
        ),
      });
    } catch (error) {
      logger.error('Answer feedback submit failed', { error });
      toast.error(t('feedback.failed', 'Failed to submit feedback'));
    } finally {
      setPending(false);
    }
  };

  if (submitted) {
    return (
      <p
        className={cn('text-xs text-muted-foreground', className)}
        data-testid="answer-feedback-thanks"
        role="status"
      >
        {t('answerFeedback.thanks', 'Thanks — noted for this search.')}
      </p>
    );
  }

  return (
    <div
      className={cn('flex flex-wrap items-center gap-2', className)}
      data-testid="answer-feedback"
    >
      <span className="text-xs text-muted-foreground">
        {t('answerFeedback.prompt', 'Were these results helpful?')}
      </span>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 min-w-9 px-2 rounded-full"
          aria-label={t('answerFeedback.yes', 'Yes, these results helped')}
          aria-pressed={vote === 'up'}
          onClick={handleUp}
        >
          <ThumbsUp className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-9 min-w-9 px-2 rounded-full',
            vote === 'down' && 'bg-muted text-foreground',
          )}
          aria-label={t('answerFeedback.no', 'No, these results were wrong')}
          aria-pressed={vote === 'down'}
          onClick={handleDown}
        >
          <ThumbsDown className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {vote === 'down' && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-full px-3 text-xs"
            disabled={pending}
            onClick={() => void handleReason('wrong')}
          >
            {t('answerFeedback.reasonWrong', 'Wrong results')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-full px-3 text-xs"
            disabled={pending}
            onClick={() => void handleReason('incomplete')}
          >
            {t('answerFeedback.reasonIncomplete', 'Missing cards')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 rounded-full px-3 text-xs"
            onClick={() => setDialogOpen(true)}
          >
            {t('answerFeedback.addDetails', 'Add details')}
          </Button>
        </div>
      )}

      {dialogOpen && (
        <Suspense fallback={null}>
          <ReportIssueDialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setVote(null);
              }
            }}
            onSubmitted={() => setSubmitted(true)}
            originalQuery={originalQuery}
            compiledQuery={scryfallQuery}
            filters={filters}
            requestId={requestId}
          />
        </Suspense>
      )}

    </div>
  );
}
