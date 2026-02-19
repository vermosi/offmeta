/**
 * Shared loading / end-of-results indicator for card grids.
 */

import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface LoadMoreIndicatorProps {
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  totalCards: number;
  showEndMessage?: boolean;
}

export const LoadMoreIndicator = forwardRef<HTMLDivElement, LoadMoreIndicatorProps>(
  function LoadMoreIndicator({ isFetchingNextPage, hasNextPage, totalCards, showEndMessage = true }, ref) {
    const { t } = useTranslation();

    return (
      <div
        ref={ref}
        className="flex justify-center pt-8 pb-4"
        role="status"
        aria-live="polite"
      >
        {isFetchingNextPage && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>{t('results.loadingMore')}</span>
          </div>
        )}
        {!hasNextPage && totalCards > 0 && showEndMessage && (
          <span className="text-sm text-muted-foreground">
            {showEndMessage
              ? t('results.endMessage').replace('{count}', totalCards.toLocaleString())
              : t('results.cardsTotal').replace('{count}', totalCards.toLocaleString())}
          </span>
        )}
      </div>
    );
  },
);
