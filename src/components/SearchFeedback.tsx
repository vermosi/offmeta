import { useState } from 'react';
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
import { toast } from 'sonner';
import { MessageSquarePlus, Loader2 } from 'lucide-react';
import { useAnalytics } from '@/hooks';
import { useTranslation } from '@/lib/i18n';
import { checkRateLimit } from '@/lib/feedback';
import { validateIssue, extractErrorDetail } from '@/lib/feedback';
import { submitFeedback } from '@/lib/feedback';

interface SearchFeedbackProps {
  originalQuery: string;
  translatedQuery?: string;
}

export function SearchFeedback({
  originalQuery,
  translatedQuery,
}: SearchFeedbackProps) {
  const [open, setOpen] = useState(false);
  const [issue, setIssue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { trackFeedback } = useAnalytics();
  const { t } = useTranslation();

  const handleSubmit = async () => {
    const rateLimitStatus = checkRateLimit();
    if (!rateLimitStatus.allowed) {
      toast.error(t('feedback.tooMany'), {
        description: t('feedback.tooManyDesc').replace('{minutes}', String(rateLimitStatus.resetInMinutes)),
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
      await submitFeedback({
        originalQuery,
        translatedQuery: translatedQuery ?? null,
        issueDescription: validationResult.data.issueDescription,
      });

      try {
        trackFeedback({
          query: originalQuery,
          issue_description: validationResult.data.issueDescription,
        });
      } catch { /* ignore */ }

      const remaining = checkRateLimit().remainingSubmissions;
      toast.success(t('feedback.submitted'), {
        description: remaining <= 2
          ? t('feedback.thanksRemaining').replace('{remaining}', String(remaining))
          : t('feedback.thanks'),
      });
      setOpen(false);
      setIssue('');
      setValidationError(null);
    } catch (error: unknown) {
      toast.error(t('feedback.failed'), {
        description: extractErrorDetail(error),
        duration: 8000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const rateLimitStatus = checkRateLimit();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground rounded-full"
          title="Report search issue"
        >
          <MessageSquarePlus className="h-4 w-4" />
          <span className="hidden sm:inline">{t('feedback.label')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('feedback.dialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('feedback.dialogDesc')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="text-sm space-y-1">
            <p className="text-muted-foreground">{t('feedback.yourSearch')}</p>
            <p className="font-medium text-foreground">
              {originalQuery || t('feedback.noSearchYet')}
            </p>
          </div>
          {translatedQuery && (
            <div className="text-sm space-y-1">
              <p className="text-muted-foreground">{t('feedback.translatedTo')}</p>
              <code className="text-xs bg-muted px-2 py-1 rounded block break-all">
                {translatedQuery}
              </code>
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="issue" className="text-sm font-medium">
              {t('feedback.whatWentWrong')}
            </label>
            <Textarea
              id="issue"
              placeholder={t('feedback.placeholder')}
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
              {t('feedback.rateLimitReached').replace('{minutes}', String(rateLimitStatus.resetInMinutes))}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('feedback.cancel')}
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
              {t('feedback.submit')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
