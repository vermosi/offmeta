/**
 * Layout-aware loading skeletons for the search results area.
 *
 * Renders skeletons that mirror the active view mode (grid / list / images)
 * so the eventual result swap doesn't shift layout. Also surfaces a
 * lightweight phase banner that escalates its reassurance message the
 * longer the request runs, so the user always knows something is
 * happening even on slow networks.
 */

import { useEffect, useState } from 'react';
import { Loader2, Sparkles, Database } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/lib/i18n';
import type { ViewMode } from '@/lib/view-mode-storage';

interface SearchResultsSkeletonProps {
  viewMode?: ViewMode;
  /** Number of skeleton placeholders — sensible defaults per view mode */
  count?: number;
  /** Optional label override; defaults to translated status. */
  label?: string;
}

function ProgressBanner({ label }: { label?: string }) {
  const { t } = useTranslation();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const id = window.setInterval(() => {
      setElapsed(Math.floor((performance.now() - start) / 1000));
    }, 500);
    return () => window.clearInterval(id);
  }, []);

  const reassurance =
    elapsed >= 8
      ? t(
          'results.stillWorkingLong',
          'Still working — complex queries can take a moment.',
        )
      : elapsed >= 4
        ? t('results.stillWorking', 'Still working…')
        : null;

  const heading =
    label ?? t('results.loadingResults', 'Loading results…');

  const Icon = elapsed >= 4 ? Database : Sparkles;

  return (
    <div
      className="flex flex-col items-center gap-2 pb-4"
      role="status"
      aria-live="polite"
    >
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/5 border border-primary/15 text-primary">
        <Icon className="h-3.5 w-3.5 animate-pulse" aria-hidden="true" />
        <span>{heading}</span>
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
      </div>
      {reassurance && (
        <p className="text-[11px] text-muted-foreground animate-fade-in">
          {reassurance} {elapsed}s
        </p>
      )}
    </div>
  );
}

function ListSkeleton({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-1.5" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg border border-border/40 bg-card/40 p-3"
        >
          <Skeleton className="h-12 w-9 rounded-md shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

function ImagesSkeleton({ count }: { count: number }) {
  return (
    <div
      className="grid grid-cols-2 min-[480px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3"
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="aspect-[488/680] w-full rounded-lg" />
      ))}
    </div>
  );
}

function GridSkeleton({ count }: { count: number }) {
  return (
    <div
      className="grid grid-cols-2 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4"
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-[488/680] w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function SearchResultsSkeleton({
  viewMode = 'grid',
  count,
  label,
}: SearchResultsSkeletonProps) {
  const { t } = useTranslation();
  const resolvedCount =
    count ?? (viewMode === 'list' ? 8 : viewMode === 'images' ? 12 : 8);

  return (
    <section
      role="status"
      aria-live="polite"
      aria-label={t('a11y.searching', 'Searching…')}
      className="animate-fade-in"
    >
      <ProgressBanner label={label} />
      {viewMode === 'list' ? (
        <ListSkeleton count={resolvedCount} />
      ) : viewMode === 'images' ? (
        <ImagesSkeleton count={resolvedCount} />
      ) : (
        <GridSkeleton count={resolvedCount} />
      )}
      <span className="sr-only">
        {t('a11y.searching', 'Searching…')}
      </span>
    </section>
  );
}

/**
 * Compact skeleton row shown at the bottom of the grid while paginating,
 * so the reader isn't left staring at a lone spinner.
 */
export function LoadMoreSkeletonRow({
  viewMode = 'grid',
}: {
  viewMode?: ViewMode;
}) {
  if (viewMode === 'list') return <ListSkeleton count={3} />;
  if (viewMode === 'images')
    return (
      <div
        className="grid grid-cols-2 min-[480px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3"
        aria-hidden="true"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[488/680] w-full rounded-lg" />
        ))}
      </div>
    );
  return <GridSkeleton count={4} />;
}
