/**
 * Editable query bar that shows the compiled Scryfall query above results.
 * Always visible, editable, with Re-run, Copy query, and Open in Scryfall buttons.
 */

import { useState, useEffect, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Play,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  X,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditableQueryBarProps {
  scryfallQuery: string;
  confidence?: number;
  isLoading?: boolean;
  validationError?: string | null;
  onRerun: (editedQuery: string) => void;
  onRegenerate?: () => void;
  onReportIssue?: () => void;
  requestId?: string;
}

export const EditableQueryBar = memo(function EditableQueryBar({
  scryfallQuery,
  confidence,
  isLoading,
  validationError,
  onRerun,
  onRegenerate,
  onReportIssue,
  requestId,
}: EditableQueryBarProps) {
  const [editedQuery, setEditedQuery] = useState(scryfallQuery);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasChanges = editedQuery !== scryfallQuery;

  // Sync with incoming query changes (new search)
  useEffect(() => {
    setEditedQuery(scryfallQuery);
    setIsEditing(false);
  }, [scryfallQuery]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(editedQuery);
      setCopied(true);
      toast.success('Query copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [editedQuery]);

  const handleOpenInScryfall = useCallback(() => {
    const url = `https://scryfall.com/search?q=${encodeURIComponent(editedQuery)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [editedQuery]);

  const handleRerun = useCallback(() => {
    if (!editedQuery.trim()) {
      toast.error('Query cannot be empty');
      return;
    }
    onRerun(editedQuery);
  }, [editedQuery, onRerun]);

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

  const handleReportClick = useCallback(() => {
    onReportIssue?.();
  }, [onReportIssue]);

  const confidenceColor = confidence
    ? confidence >= 0.9
      ? 'text-emerald-600 dark:text-emerald-400'
      : confidence >= 0.75
        ? 'text-amber-600 dark:text-amber-400'
        : confidence >= 0.6
          ? 'text-orange-600 dark:text-orange-400'
          : 'text-red-500 dark:text-red-400'
    : '';

  const confidenceLabel = confidence
    ? confidence >= 0.9
      ? 'High'
      : confidence >= 0.75
        ? 'Good'
        : confidence >= 0.6
          ? 'Moderate'
          : 'Low'
    : null;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-2">
      {/* Header with confidence and report */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">Scryfall Query</span>
          {confidenceLabel && (
            <span className={cn('font-medium', confidenceColor)}>
              {confidenceLabel} ({Math.round((confidence || 0) * 100)}%)
            </span>
          )}
          {hasChanges && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              edited
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onRegenerate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRegenerate}
              className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" />
              Regenerate
            </Button>
          )}
          {onReportIssue && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReportClick}
              className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
            >
              <AlertTriangle className="h-3 w-3" />
              Report Issue
            </Button>
          )}
        </div>
      </div>

      {/* Validation error */}
      {validationError && (
        <div className="flex items-start gap-2 p-2 rounded-lg border border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400 text-xs">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <p>{validationError}</p>
        </div>
      )}

      {/* Editable query input */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
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
                'border-red-500/50 focus-visible:ring-red-500/20',
              hasChanges && !validationError && 'border-blue-500/50',
            )}
            placeholder="Enter Scryfall query..."
            disabled={isLoading}
            aria-label="Scryfall query"
          />
          {isEditing && hasChanges && (
            <button
              onClick={() => {
                setEditedQuery(scryfallQuery);
                setIsEditing(false);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded"
              aria-label="Reset to original query"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant={hasChanges ? 'accent' : 'secondary'}
            size="sm"
            onClick={handleRerun}
            disabled={isLoading || !editedQuery.trim()}
            className="h-10 px-3 gap-1.5"
            title="Re-run query (Enter)"
          >
            <Play className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Re-run</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-10 px-2.5"
            title="Copy query"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenInScryfall}
            className="h-10 px-2.5 gap-1.5"
            title="Open in Scryfall"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Scryfall</span>
          </Button>
        </div>
      </div>

      {/* Debug info (hidden by default, shown in dev mode or when needed) */}
      {requestId && (
        <p className="text-[10px] text-muted-foreground/50 px-1">
          Request: {requestId}
        </p>
      )}
    </div>
  );
});
