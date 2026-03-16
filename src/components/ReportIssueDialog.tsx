/**
 * Report Issue Dialog with auto-included context:
 * - User prompt
 * - Compiled query
 * - Active filters
 * - Timestamp
 * - Request ID
 */

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import type { FilterState } from '@/types/filters';

import { checkRateLimit } from '@/lib/feedback/rate-limit';
import { validateIssue, extractErrorDetail } from '@/lib/feedback/validate';
import { submitFeedback } from '@/lib/feedback/submit';
import { ReportContextPanel } from '@/components/report/ReportContextPanel';

interface ReportIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalQuery: string;
  compiledQuery: string;
  filters?: FilterState | null;
  requestId?: string;
}

export function ReportIssueDialog({
  open,
  onOpenChange,
  originalQuery,
  compiledQuery,
  filters,
  requestId,
}: ReportIssueDialogProps) {
  const { t } = useTranslation();
  const [issue, setIssue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { trackFeedback } = useAnalytics();

  const timestamp = new Date().toISOString();

  useEffect(() => {
    if (open) {
      setIssue('');
      setValidationError(null);
    }
  }, [open]);

  const contextText = JSON.stringify(
    {
      originalQuery,
      compiledQuery,
      filters: filters || {},
      timestamp,
      requestId: requestId || 'N/A',
    },
    null,
    2,
  );

  const handleSubmit = async () => {
    const rateLimitStatus = checkRateLimit();
    if (!rateLimitStatus.allowed) {
      toast.error(t('report.tooMany', 'Too many submissions'), {
        description: t(
          'report.wait',
          'Please wait {minutes} minute(s) before submitting more feedback.',
        ).replace('{minutes}', rateLimitStatus.resetInMinutes.toString()),
      });
      return;
    }

    const validationResult = validateIssue(issue);
    if (!validationResult.success) {
      setValidationError(validationResult.message);
      toast.error(validationResult.message);
      return;
    }

    setIsSubmitting(true);
    try {
      const fullDescription = `${validationResult.data.issueDescription}\n\n---\nContext:\n- Request ID: ${requestId || 'N/A'}\n- Timestamp: ${timestamp}\n- Filters: ${JSON.stringify(filters || {})}`;

      await submitFeedback({
        originalQuery,
        translatedQuery: compiledQuery,
        issueDescription: fullDescription,
      });

      try {
        trackFeedback({
          query: originalQuery,
          issue_description: validationResult.data.issueDescription,
        });
      } catch { /* ignore */ }

      const remaining = checkRateLimit().remainingSubmissions;
      toast.success(t('report.success', 'Issue reported'), {
        description: `${t('report.thanks', "Thanks! We'll use this to improve searches.")}${remaining <= 2 ? ` (${remaining} submissions remaining)` : ''}`,
      });
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(t('report.failed', 'Failed to submit feedback'), {
        description: extractErrorDetail(error),
        duration: 8000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const rateLimitStatus = checkRateLimit();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('report.title', 'Report Search Issue')}</DialogTitle>
          <DialogDescription>
            {t(
              'report.description',
              'Help us improve by describing what went wrong. Context is auto-included.',
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <ReportContextPanel
            originalQuery={originalQuery}
            compiledQuery={compiledQuery}
            contextText={contextText}
          />

          <div className="space-y-2">
            <label htmlFor="issue" className="text-sm font-medium">
              {t('report.label', 'What went wrong?')}
            </label>
            <Textarea
              id="issue"
              placeholder={t(
                'report.placeholder',
                'e.g., I expected to see cards that give flash, but it only showed creatures with flash...',
              )}
              value={issue}
              onChange={(e) => {
                setIssue(e.target.value);
                setValidationError(null);
              }}
              rows={3}
              maxLength={1000}
              className={validationError ? 'border-destructive' : ''}
            />
            {validationError && (
              <p className="text-xs text-destructive">{validationError}</p>
            )}
            <p className="text-xs text-muted-foreground text-right">
              {issue.length}/1000
            </p>
          </div>

          {!rateLimitStatus.allowed && (
            <p className="text-xs text-destructive">
              {t(
                'report.rateLimit',
                'Rate limit reached. Please wait {minutes} minute(s).',
              ).replace('{minutes}', rateLimitStatus.resetInMinutes.toString())}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('report.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                isSubmitting || !issue.trim() || !rateLimitStatus.allowed
              }
            >
              {isSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {t('report.submit', 'Submit Report')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
