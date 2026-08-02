/**
 * Shared loading / end-of-results indicator for card grids.
 * When paginating, shows a mini skeleton row that matches the active
 * view mode so the layout keeps breathing while the next page loads.
 * When a pagination request fails, shows a friendly error with a retry button.
 */

import { forwardRef } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { LoadMoreSkeletonRow } from '@/components/SearchResultsSkeleton';
import { Button } from '@/components/ui/button';
import type { ViewMode } from '@/lib/view-mode-storage';

interface LoadMoreIndicatorProps {
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  totalCards: number;
  showEndMessage?: boolean;
  viewMode?: ViewMode;
  isFetchNextPageError?: boolean;
  error?: Error | null;
  isError?: boolean;
  onRetry?: () => void;
}

export const LoadMoreIndicator = forwardRef<HTMLDivElement, LoadMoreIndicatorProps>(
  function LoadMoreIndicator(
    {
      isFetchingNextPage,
      hasNextPage,
      totalCards,
      showEndMessage = true,
      viewMode = 'grid',
      isFetchNextPageError,
      error,
      isError,
      onRetry,
    },
    ref,
  ) {
    const { t } = useTranslation();

    const showError = isFetchNextPageError || isError || error != null;

    return (
      <div ref={ref} className="pt-6 pb-4" role="status" aria-live="polite">
        {showError ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-6 py-4 text-center">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" aria-hidden="true" />
              <span className="font-medium">
                {t(
                  'results.loadMoreErrorTitle',
                  "Couldn't load more cards",
                )}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t(
                'results.loadMoreErrorDescription',
                'This is usually a temporary Scryfall connection issue.',
              )}
            </p>
            {onRetry && (
              <Button
                variant="default"
                size="sm"
                onClick={onRetry}
                className="gap-2"
                aria-label={t('results.retryButton', 'Try again')}
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                {t('results.retryButton', 'Try again')}
              </Button>
            )}
            {error instanceof Error && error.message && (
              <p className="text-xs text-muted-foreground/70">
                {error.message}
              </p>
            )}
          </div>
        ) : isFetchingNextPage ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              <span>{t('results.loadingMore')}</span>
            </div>
            <LoadMoreSkeletonRow viewMode={viewMode} />
          </div>
        ) : null}
        {!showError && !isFetchingNextPage && !hasNextPage && totalCards > 0 && showEndMessage && (
          <div className="flex justify-center">
            <span className="text-sm text-muted-foreground">
              {t('results.endMessage').replace('{count}', totalCards.toLocaleString())}
            </span>
          </div>
        )}
      </div>
    );
  },
);
