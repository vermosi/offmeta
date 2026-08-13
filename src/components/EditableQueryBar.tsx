/**
 * Editable query bar that shows the compiled Scryfall query above results.
 * Always visible and editable: the input plus Re-run stay inline, while
 * secondary actions (copy, open in Scryfall, regenerate) live in an overflow
 * menu. Sharing lives in the results toolbar, not here.
 */

import { useState, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Play,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  X,
  RotateCcw,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { useTranslation } from '@/lib/i18n';

interface EditableQueryBarProps {
  scryfallQuery: string;
  confidence?: number;
  isLoading?: boolean;
  validationError?: string | null;
  onRerun: (editedQuery: string) => void;
  onRegenerate?: () => void;
}

export const EditableQueryBar = memo(function EditableQueryBar({
  scryfallQuery,
  confidence,
  isLoading,
  validationError,
  onRerun,
  onRegenerate,
}: EditableQueryBarProps) {
  const { t } = useTranslation();
  const [editedQuery, setEditedQuery] = useState(scryfallQuery);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync with incoming query changes (render-phase adjustment)
  const [prevScryfallQuery, setPrevScryfallQuery] = useState(scryfallQuery);
  if (prevScryfallQuery !== scryfallQuery) {
    setPrevScryfallQuery(scryfallQuery);
    setEditedQuery(scryfallQuery);
    setIsEditing(false);
  }

  const hasChanges = editedQuery !== scryfallQuery;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(editedQuery);
      setCopied(true);
      toast.success(t('queryBar.copied', 'Query copied!'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('queryBar.copyFailed', 'Failed to copy'));
    }
  }, [editedQuery, t]);

  const handleOpenInScryfall = useCallback(() => {
    const url = `https://scryfall.com/search?q=${encodeURIComponent(editedQuery)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [editedQuery]);

  const handleRerun = useCallback(() => {
    if (!editedQuery.trim()) {
      toast.error(t('queryBar.emptyError', 'Query cannot be empty'));
      return;
    }
    onRerun(editedQuery);
  }, [editedQuery, onRerun, t]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleRerun();
      }
      if (e.key === 'Escape') {
        setEditedQuery(scryfallQuery);
        setIsEditing(false);
      }
    },
    [handleRerun, scryfallQuery],
  );

  // Simplified confidence - only show warning for low confidence
  const showConfidenceWarning = confidence !== undefined && confidence < 0.6;
  return (
    <div
      className="w-full mx-auto space-y-2"
      style={{ maxWidth: 'clamp(320px, 90vw, 672px)' }}
    >
      {/* Header — status only; actions live in the overflow menu */}
      <div className="flex items-center gap-2 px-1 text-xs">
        <span className="text-muted-foreground">
          {t('queryBar.label', 'Scryfall query · click to edit')}
        </span>
        {showConfidenceWarning && (
          <span className="text-warning font-medium">
            {t('queryBar.lowConfidence', 'Low confidence')}
          </span>
        )}
        {hasChanges && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
            {t('queryBar.edited', 'edited')}
          </span>
        )}
      </div>

      {/* Validation error */}
      {validationError && (
        <div className="flex items-start gap-2 p-2 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-xs">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <p>{validationError}</p>
        </div>
      )}

      {/* Query input + the only two query-focused actions */}
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1 min-w-0">
          <Input
            value={editedQuery}
            onChange={(e) => {
              setEditedQuery(e.target.value);
              setIsEditing(true);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsEditing(true)}
            className={cn(
              'font-mono text-sm pr-8 h-10',
              validationError &&
                'border-destructive/50 focus-visible:ring-destructive/20',
              hasChanges && !validationError && 'border-info/50',
            )}
            placeholder={t('queryBar.placeholder', 'Enter Scryfall query...')}
            disabled={isLoading}
            aria-label={t('queryBar.ariaLabel', 'Scryfall query')}
            aria-describedby="query-bar-hint"
          />
          <span id="query-bar-hint" className="sr-only">
            {t(
              'queryBar.hint',
              'Edit the Scryfall query and press Enter to re-run the search.',
            )}
          </span>
          {isEditing && hasChanges && (
            <button
              onClick={() => {
                setEditedQuery(scryfallQuery);
                setIsEditing(false);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded"
              aria-label={t('queryBar.reset', 'Reset to original query')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Button
          variant={hasChanges ? 'accent' : 'secondary'}
          size="sm"
          onClick={handleRerun}
          disabled={isLoading || !editedQuery.trim()}
          className="h-10 px-3 gap-1.5 shrink-0"
          title={t('queryBar.rerunTitle', 'Re-run query (Enter)')}
        >
          <Play className="h-3.5 w-3.5" />
          <span>{t('queryBar.rerun', 'Re-run')}</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-10 w-10 p-0 shrink-0"
              aria-label={t('queryBar.moreOptions', 'More options')}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleCopy}>
              {copied ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {t('queryBar.copy', 'Copy query')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleOpenInScryfall}>
              <ExternalLink className="h-4 w-4 mr-2" />
              {t('queryBar.openInScryfall', 'Open in Scryfall')}
            </DropdownMenuItem>
            {onRegenerate && (
              <DropdownMenuItem onClick={onRegenerate}>
                <RotateCcw className="h-4 w-4 mr-2" />
                {t('queryBar.regenerate', 'Regenerate')}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
