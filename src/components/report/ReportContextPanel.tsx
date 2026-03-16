import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';

interface ReportContextPanelProps {
  originalQuery: string;
  compiledQuery: string;
  contextText: string;
}

export function ReportContextPanel({
  originalQuery,
  compiledQuery,
  contextText,
}: ReportContextPanelProps) {
  const { t } = useTranslation();
  const [showContext, setShowContext] = useState(false);
  const [copiedContext, setCopiedContext] = useState(false);

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

  return (
    <div className="p-3 rounded-lg border border-border bg-secondary/50 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t('report.autoContext', 'Auto-included context')}
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
            {t('report.copy', 'Copy')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowContext(!showContext)}
            className="h-6 px-2 text-xs gap-1"
            aria-expanded={showContext}
          >
            {showContext ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            {showContext
              ? t('report.hide', 'Hide')
              : t('report.show', 'Show')}
          </Button>
        </div>
      </div>

      {!showContext && (
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            <span className="font-medium">
              {t('report.prompt', 'Prompt:')}
            </span>{' '}
            "{originalQuery.substring(0, 50)}
            {originalQuery.length > 50 ? '...' : ''}"
          </p>
          <p>
            <span className="font-medium">
              {t('report.query', 'Query:')}
            </span>{' '}
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
  );
}
