import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus } from 'lucide-react';
import { ReportIssueDialog } from '@/components/ReportIssueDialog';
import { useTranslation } from '@/lib/i18n';

interface SearchFeedbackProps {
  originalQuery: string;
  translatedQuery?: string;
}

export function SearchFeedback({
  originalQuery,
  translatedQuery,
}: SearchFeedbackProps) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2 gap-1.5 text-xs text-foreground/90 hover:text-foreground rounded-full"
        aria-label={t('feedback.reportSearchIssue', 'Report search issue')}
        title={t('feedback.reportSearchIssue', 'Report search issue')}
        data-testid="search-feedback-trigger"
        onClick={() => setOpen(true)}
      >
        <MessageSquarePlus className="h-4 w-4" />
        <span className="hidden sm:inline">{t('feedback.label')}</span>
      </Button>
      <ReportIssueDialog
        open={open}
        onOpenChange={setOpen}
        originalQuery={originalQuery}
        compiledQuery={translatedQuery ?? ''}
      />
    </>
  );
}
