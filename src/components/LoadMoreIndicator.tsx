/**
 * Shared loading / end-of-results indicator for card grids.
 * When paginating, shows a mini skeleton row that matches the active
 * view mode so the layout keeps breathing while the next page loads.
 */

import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { LoadMoreSkeletonRow } from '@/components/SearchResultsSkeleton';
import type { ViewMode } from '@/lib/view-mode-storage';

interface LoadMoreIndicatorProps {
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  totalCards: number;
  showEndMessage?: boolean;
  viewMode?: ViewMode;
}

export const LoadMoreIndicator = forwardRef<HTMLDivElement, LoadMoreIndicatorProps>(
  function LoadMoreIndicator(
    { isFetchingNextPage, hasNextPage, totalCards, showEndMessage = true, viewMode = 'grid' },
    ref,
  ) {
    const { t } = useTranslation();

    return (
      <div ref={ref} className="pt-6 pb-4" role="status" aria-live="polite">
        {isFetchingNextPage && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              <span>{t('results.loadingMore')}</span>
            </div>
            <LoadMoreSkeletonRow viewMode={viewMode} />
          </div>
        )}
        {!isFetchingNextPage && !hasNextPage && totalCards > 0 && showEndMessage && (
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
