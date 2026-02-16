/**
 * Editable query bar that shows the compiled Scryfall query above results.
 * Always visible, editable, with Re-run, Copy query, and Open in Scryfall buttons.
 * Mobile-optimized with icon-only buttons and dropdown menu.
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
  Share2,
} from 'lucide-react';
import { cn } from '@/lib/core/utils';

interface EditableQueryBarProps {
  scryfallQuery: string;
  confidence?: number;
  isLoading?: boolean;
  validationError?: string | null;
  originalQuery?: string;
  onRerun: (editedQuery: string) => void;
  onRegenerate?: () => void;
  onReportIssue?: () => void;
}

export const EditableQueryBar = memo(function EditableQueryBar({
  scryfallQuery,
  confidence,
  isLoading,
  validationError,
  originalQuery,
  onRerun,
  onRegenerate,
  onReportIssue,
}: EditableQueryBarProps) {
  const [editedQuery, setEditedQuery] = useState(scryfallQuery);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

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

  const handleShare = useCallback(async () => {
    const shareQuery = originalQuery || editedQuery;
    const shareUrl = `${window.location.origin}/?q=${encodeURIComponent(shareQuery)}`;
    const shareData = {
      title: `${shareQuery} — OffMeta MTG Search`,
      text: `Check out these Magic cards: "${shareQuery}"`,
      url: shareUrl,
    };

    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setShared(true);
        toast.success('Link copied!');
        setTimeout(() => setShared(false), 2000);
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        await navigator.clipboard.writeText(shareUrl);
        setShared(true);
        toast.success('Link copied!');
        setTimeout(() => setShared(false), 2000);
      }
    }
  }, [originalQuery, editedQuery]);

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

  // Simplified confidence - only show warning for low confidence
  const showConfidenceWarning = confidence !== undefined && confidence < 0.6;

  return (
    <div
      className="w-full mx-auto space-y-2"
      style={{ maxWidth: 'clamp(320px, 90vw, 672px)' }}
    >
      {/* Header - simplified */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Scryfall query · click to edit</span>
          {showConfidenceWarning && (
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              Low confidence
            </span>
          )}
          {hasChanges && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
              edited
            </span>
          )}
        </div>

        {/* Desktop: inline buttons; Mobile: dropdown menu */}
        <div className="hidden sm:flex items-center gap-1">
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

        {/* Mobile: dropdown menu for secondary actions */}
        {(onRegenerate || onReportIssue) && (
          <div className="sm:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  aria-label="More options"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {onRegenerate && (
                  <DropdownMenuItem onClick={onRegenerate}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Regenerate
                  </DropdownMenuItem>
                )}
                {onReportIssue && (
                  <DropdownMenuItem onClick={handleReportClick}>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Report Issue
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Validation error */}
      {validationError && (
        <div className="flex items-start gap-2 p-2 rounded-lg border border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400 text-xs">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <p>{validationError}</p>
        </div>
      )}

      {/* Editable query input - stacked layout on mobile */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
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

        {/* Action buttons - full width row on mobile */}
        <div className="flex items-center gap-1.5 sm:gap-1">
          <Button
            variant={hasChanges ? 'accent' : 'secondary'}
            size="sm"
            onClick={handleRerun}
            disabled={isLoading || !editedQuery.trim()}
            className="h-10 px-3 gap-1.5"
            title="Re-run query (Enter)"
          >
            <Play className="h-3.5 w-3.5" />
            <span>Re-run</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-10 w-10 sm:w-auto sm:px-2.5 p-0 sm:p-2"
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
            onClick={handleShare}
            className="h-10 px-2.5 gap-1.5"
            title="Share this search"
          >
            {shared ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Share2 className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">Share</span>
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

    </div>
  );
});
