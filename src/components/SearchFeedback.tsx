import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MessageSquarePlus, Loader2 } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { z } from 'zod';

interface SearchFeedbackProps {
  originalQuery: string;
  translatedQuery?: string;
  compiledQuery?: string;
  activeFilters?: {
    colors: string[];
    types: string[];
    cmcRange: [number, number];
    sortBy: string;
  };
  requestId?: string | null;
  timestamp?: string;
}

// Rate limiting configuration
const RATE_LIMIT_KEY = 'search_feedback_submissions';
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_SUBMISSIONS_PER_WINDOW = 5;

// Input validation schema
const feedbackSchema = z.object({
  originalQuery: z.string().trim().max(500, 'Query too long'),
  translatedQuery: z.string().trim().max(1000, 'Translated query too long').nullable(),
  issueDescription: z.string()
    .trim()
    .min(10, 'Please provide more details (at least 10 characters)')
    .max(1000, 'Description too long (max 1000 characters)')
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
  return submissions.filter(timestamp => timestamp > cutoff);
}

function checkRateLimit(): { allowed: boolean; remainingSubmissions: number; resetInMinutes: number } {
  const data = getRateLimitData();
  const validSubmissions = cleanExpiredSubmissions(data.submissions);
  
  // Update stored data with cleaned submissions
  setRateLimitData({ submissions: validSubmissions });
  
  const remainingSubmissions = MAX_SUBMISSIONS_PER_WINDOW - validSubmissions.length;
  const oldestSubmission = validSubmissions[0] || Date.now();
  const resetInMs = Math.max(0, (oldestSubmission + RATE_LIMIT_WINDOW_MS) - Date.now());
  const resetInMinutes = Math.ceil(resetInMs / 60000);
  
  return {
    allowed: validSubmissions.length < MAX_SUBMISSIONS_PER_WINDOW,
    remainingSubmissions: Math.max(0, remainingSubmissions),
    resetInMinutes
  };
}

function recordSubmission(): void {
  const data = getRateLimitData();
  const validSubmissions = cleanExpiredSubmissions(data.submissions);
  validSubmissions.push(Date.now());
  setRateLimitData({ submissions: validSubmissions });
}

export function SearchFeedback({
  originalQuery,
  translatedQuery,
  compiledQuery,
  activeFilters,
  requestId,
  timestamp,
}: SearchFeedbackProps) {
  const [open, setOpen] = useState(false);
  const [issue, setIssue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { trackFeedback } = useAnalytics();

  const triggerProcessing = useCallback(async () => {
    try {
      // Trigger the process-feedback function in the background
      await supabase.functions.invoke('process-feedback', {
        body: {}
      });
    } catch (error) {
      // Silently fail - processing is async and will be retried
      console.log('Background processing triggered');
    }
  }, []);

  const handleIssueChange = (value: string) => {
    setIssue(value);
    setValidationError(null);
  };

  const formattedFilters = activeFilters
    ? {
        colors: activeFilters.colors.join(', ') || 'none',
        types: activeFilters.types.join(', ') || 'none',
        cmcRange: `${activeFilters.cmcRange[0]}-${activeFilters.cmcRange[1]}`,
        sortBy: activeFilters.sortBy,
      }
    : null;

  const autoIncludedDetails = [
    originalQuery ? `Prompt: ${originalQuery}` : null,
    compiledQuery ? `Compiled query: ${compiledQuery}` : null,
    formattedFilters
      ? `Filters: colors=${formattedFilters.colors}; types=${formattedFilters.types}; mv=${formattedFilters.cmcRange}; sort=${formattedFilters.sortBy}`
      : null,
    requestId ? `Request ID: ${requestId}` : null,
    timestamp ? `Timestamp: ${timestamp}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const handleSubmit = async () => {
    // Check rate limit first
    const rateLimitStatus = checkRateLimit();
    if (!rateLimitStatus.allowed) {
      toast.error('Too many submissions', {
        description: `Please wait ${rateLimitStatus.resetInMinutes} minute(s) before submitting more feedback.`
      });
      return;
    }

    // Validate input
    const issueWithMetadata = autoIncludedDetails
      ? `${issue}\n\n---\n${autoIncludedDetails}`
      : issue;
    const issueForValidation = issueWithMetadata.length > 1000
      ? `${issueWithMetadata.slice(0, 997)}...`
      : issueWithMetadata;

    const validationResult = feedbackSchema.safeParse({
      originalQuery,
      translatedQuery: translatedQuery || null,
      issueDescription: issueForValidation
    });

    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors[0]?.message || 'Invalid input';
      setValidationError(errorMessage);
      toast.error(errorMessage);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('search_feedback').insert({
        original_query: validationResult.data.originalQuery,
        translated_query: validationResult.data.translatedQuery,
        issue_description: validationResult.data.issueDescription,
      });

      if (error) throw error;

      // Record submission for rate limiting
      recordSubmission();

      // Track feedback submission
      trackFeedback({
        query: originalQuery,
        issue_description: validationResult.data.issueDescription,
      });

      const remaining = checkRateLimit().remainingSubmissions;
      toast.success('Feedback submitted', {
        description: `Thanks! We'll use this to improve searches.${remaining <= 2 ? ` (${remaining} submissions remaining)` : ''}`
      });
      setOpen(false);
      setIssue('');
      setValidationError(null);

      // Trigger background processing
      triggerProcessing();
    } catch (error) {
      console.error('Feedback submission failed');
      toast.error('Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const rateLimitStatus = checkRateLimit();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1 text-xs"
          title="Report issue"
        >
          <MessageSquarePlus className="h-4 w-4" />
          Report issue
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report Search Issue</DialogTitle>
          <DialogDescription>
            Help us improve by describing what went wrong with your search.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="text-sm space-y-1">
            <p className="text-muted-foreground">Your search:</p>
            <p className="font-medium text-foreground">{originalQuery || 'No search yet'}</p>
          </div>
          {translatedQuery && (
            <div className="text-sm space-y-1">
              <p className="text-muted-foreground">Translated to:</p>
              <code className="text-xs bg-muted px-2 py-1 rounded block break-all">
                {translatedQuery}
              </code>
            </div>
          )}
          {autoIncludedDetails && (
            <div className="text-sm space-y-1">
              <p className="text-muted-foreground">Auto-included details:</p>
              <code className="text-xs bg-muted px-2 py-1 rounded block whitespace-pre-wrap break-words">
                {autoIncludedDetails}
              </code>
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="issue" className="text-sm font-medium">
              What went wrong?
            </label>
            <Textarea
              id="issue"
              placeholder="e.g., Didn't find cards that give haste like Agatha..."
              value={issue}
              onChange={(e) => handleIssueChange(e.target.value)}
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
              Rate limit reached. Please wait {rateLimitStatus.resetInMinutes} minute(s).
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !issue.trim() || !rateLimitStatus.allowed}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
