/**
 * Shared loading / end-of-results indicator for card grids.
 */

import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

interface LoadMoreIndicatorProps {
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  totalCards: number;
  showEndMessage?: boolean;
}

export const LoadMoreIndicator = forwardRef<HTMLDivElement, LoadMoreIndicatorProps>(
  function LoadMoreIndicator({ isFetchingNextPage, hasNextPage, totalCards, showEndMessage = true }, ref) {
    return (
      <div
        ref={ref}
        className="flex justify-center pt-8 pb-4"
        aria-hidden="true"
      >
        {isFetchingNextPage && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading more cards...</span>
          </div>
        )}
        {!hasNextPage && totalCards > 0 && showEndMessage && (
          <span className="text-sm text-muted-foreground">
            {showEndMessage
              ? `You've reached the end · ${totalCards.toLocaleString()} cards total`
              : `${totalCards.toLocaleString()} cards total`}
          </span>
        )}
      </div>
    );
  },
);
