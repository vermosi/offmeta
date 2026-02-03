/**
 * Report Issue Dialog with auto-included context:
 * - User prompt
 * - Compiled query
 * - Active filters
 * - Timestamp
 * - Request ID
 */

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { logger } from '@/lib/core/logger';
import { z } from 'zod';
import type { FilterState } from '@/types/filters';

interface ReportIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalQuery: string;
  compiledQuery: string;
  filters?: FilterState | null;
  requestId?: string;
}

// Rate limiting configuration
const RATE_LIMIT_KEY = 'search_feedback_submissions';
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_SUBMISSIONS_PER_WINDOW = 5;

// Input validation schema
const feedbackSchema = z.object({
  issueDescription: z
    .string()
    .trim()
    .min(10, 'Please provide more details (at least 10 characters)')
    .max(1000, 'Description too long (max 1000 characters)'),
});

interface RateLimitData {
  submissions: number[];
}

function getRateLimitData(): RateLimitData {
  try {
    const data = localStorage.getItem(RATE_LIMIT_KEY);
    if (!data) return { submissions: [] };
    return JSON.parse(data) as RateLimitData;
  } catch {
    return { submissions: [] };
  }
}

function setRateLimitData(data: RateLimitData): void {
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data));
}

function cleanExpiredSubmissions(submissions: number[]): number[] {
  const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
  return submissions.filter((timestamp) => timestamp > cutoff);
}

function checkRateLimit(): {
  allowed: boolean;
  remainingSubmissions: number;
  resetInMinutes: number;
} {
  const data = getRateLimitData();
  const validSubmissions = cleanExpiredSubmissions(data.submissions);
  setRateLimitData({ submissions: validSubmissions });

  const remainingSubmissions =
    MAX_SUBMISSIONS_PER_WINDOW - validSubmissions.length;
  const oldestSubmission = validSubmissions[0] || Date.now();
  const resetInMs = Math.max(
    0,
    oldestSubmission + RATE_LIMIT_WINDOW_MS - Date.now(),
  );
  const resetInMinutes = Math.ceil(resetInMs / 60000);

  return {
    allowed: validSubmissions.length < MAX_SUBMISSIONS_PER_WINDOW,
    remainingSubmissions: Math.max(0, remainingSubmissions),
    resetInMinutes,
  };
}

function recordSubmission(): void {
  const data = getRateLimitData();
  const validSubmissions = cleanExpiredSubmissions(data.submissions);
  validSubmissions.push(Date.now());
  setRateLimitData({ submissions: validSubmissions });
}

export function ReportIssueDialog({
  open,
  onOpenChange,
  originalQuery,
  compiledQuery,
  filters,
  requestId,
}: ReportIssueDialogProps) {
  const [issue, setIssue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showContext, setShowContext] = useState(false);
  const [copiedContext, setCopiedContext] = useState(false);
  const { trackFeedback } = useAnalytics();

  const timestamp = new Date().toISOString();

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setIssue('');
      setValidationError(null);
      setShowContext(false);
    }
  }, [open]);

  const contextData = {
    originalQuery,
    compiledQuery,
    filters: filters || {},
    timestamp,
    requestId: requestId || 'N/A',
  };

  const contextText = JSON.stringify(contextData, null, 2);

  const handleCopyContext = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(contextText);
      setCopiedContext(true);
      toast.success('Context copied!');
      setTimeout(() => setCopiedContext(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [contextText]);

  const triggerProcessing = useCallback(async () => {
    try {
      await supabase.functions.invoke('process-feedback', {
        body: {},
      });
    } catch (error) {
      logger.info('Background processing triggered', error);
    }
  }, []);

  const handleSubmit = async () => {
    const rateLimitStatus = checkRateLimit();
    if (!rateLimitStatus.allowed) {
      toast.error('Too many submissions', {
        description: `Please wait ${rateLimitStatus.resetInMinutes} minute(s) before submitting more feedback.`,
      });
      return;
    }

    const validationResult = feedbackSchema.safeParse({
      issueDescription: issue,
    });

    if (!validationResult.success) {
      const errorMessage =
        validationResult.error.errors[0]?.message || 'Invalid input';
      setValidationError(errorMessage);
      toast.error(errorMessage);
      return;
    }

    setIsSubmitting(true);
    try {
      // Include all context in the issue description for processing
      const fullDescription = `${validationResult.data.issueDescription}\n\n---\nContext:\n- Request ID: ${requestId || 'N/A'}\n- Timestamp: ${timestamp}\n- Filters: ${JSON.stringify(filters || {})}`;

      const { error } = await supabase.from('search_feedback').insert({
        original_query: originalQuery.substring(0, 500),
        translated_query: compiledQuery.substring(0, 1000),
        issue_description: fullDescription.substring(0, 2000),
      });

      if (error) throw error;

      recordSubmission();

      trackFeedback({
        query: originalQuery,
        issue_description: validationResult.data.issueDescription,
      });

      const remaining = checkRateLimit().remainingSubmissions;
      toast.success('Issue reported', {
        description: `Thanks! We'll use this to improve searches.${remaining <= 2 ? ` (${remaining} submissions remaining)` : ''}`,
      });
      onOpenChange(false);
      triggerProcessing();
    } catch (error) {
      logger.error('Feedback submission failed', error);
      toast.error('Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const rateLimitStatus = checkRateLimit();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Report Search Issue</DialogTitle>
          <DialogDescription>
            Help us improve by describing what went wrong. Context is
            auto-included.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Auto-included context summary */}
          <div className="p-3 rounded-lg border border-border bg-secondary/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Auto-included context
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyContext}
                  className="h-6 px-2 text-xs gap-1"
                >
                  {copiedContext ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  Copy
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowContext(!showContext)}
                  className="h-6 px-2 text-xs gap-1"
                >
                  {showContext ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  {showContext ? 'Hide' : 'Show'}
                </Button>
              </div>
            </div>

            {!showContext && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  <span className="font-medium">Prompt:</span> "
                  {originalQuery.substring(0, 50)}
                  {originalQuery.length > 50 ? '...' : ''}"
                </p>
                <p>
                  <span className="font-medium">Query:</span>{' '}
                  <code className="bg-muted px-1 rounded">
                    {compiledQuery.substring(0, 40)}
                    {compiledQuery.length > 40 ? '...' : ''}
                  </code>
                </p>
              </div>
            )}

            {showContext && (
              <pre className="text-[10px] bg-muted p-2 rounded overflow-auto max-h-32 font-mono">
                {contextText}
              </pre>
            )}
          </div>

          {/* Issue description */}
          <div className="space-y-2">
            <label htmlFor="issue" className="text-sm font-medium">
              What went wrong?
            </label>
            <Textarea
              id="issue"
              placeholder="e.g., I expected to see cards that give flash, but it only showed creatures with flash..."
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
              Rate limit reached. Please wait {rateLimitStatus.resetInMinutes}{' '}
              minute(s).
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
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
              Submit Report
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
