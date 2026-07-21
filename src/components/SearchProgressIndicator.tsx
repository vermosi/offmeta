/**
 * Three-step progress indicator for the search flow:
 *   1. Translate  — plain English → Scryfall syntax
 *   2. Search     — query executed against Scryfall
 *   3. Results    — cards rendered in the UI
 *
 * Phases are derived from existing search state, so no changes to the
 * pipeline are required. The indicator auto-hides ~1.2s after completion.
 */
import { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';

type StepStatus = 'pending' | 'active' | 'done';

interface SearchProgressIndicatorProps {
  isSearching: boolean;
  hasSearched: boolean;
  scryfallQuery: string | null | undefined;
  cardCount: number;
}

export function SearchProgressIndicator({
  isSearching,
  hasSearched,
  scryfallQuery,
  cardCount,
}: SearchProgressIndicatorProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  const hasTranslation = Boolean(scryfallQuery && scryfallQuery.length > 0);
  const finished = !isSearching && hasSearched;

  const translateStatus: StepStatus = hasTranslation
    ? 'done'
    : isSearching
      ? 'active'
      : 'pending';

  const searchStatus: StepStatus = finished
    ? 'done'
    : hasTranslation && isSearching
      ? 'active'
      : 'pending';

  const resultsStatus: StepStatus =
    finished && cardCount > 0
      ? 'done'
      : finished
        ? 'active'
        : 'pending';

  // Show whenever a search is running; keep briefly after completion so
  // users see the final "done" state, then fade out.
  useEffect(() => {
    if (isSearching) {
      setVisible(true);
      return;
    }
    if (!hasSearched) {
      setVisible(false);
      return;
    }
    const timeout = window.setTimeout(() => setVisible(false), 1200);
    return () => window.clearTimeout(timeout);
  }, [isSearching, hasSearched]);

  if (!visible) return null;

  const steps: Array<{ key: string; label: string; status: StepStatus }> = [
    {
      key: 'translate',
      label: t('search.progress.translate', 'Translate'),
      status: translateStatus,
    },
    {
      key: 'search',
      label: t('search.progress.search', 'Search'),
      status: searchStatus,
    },
    {
      key: 'results',
      label: t('search.progress.results', 'Results'),
      status: resultsStatus,
    },
  ];

  const completedCount = steps.filter((s) => s.status === 'done').length;
  const progressPercent = (completedCount / steps.length) * 100;

  return (
    <div
      className="mt-2 animate-reveal"
      role="status"
      aria-live="polite"
      aria-label={t('search.progress.ariaLabel', 'Search progress')}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        {steps.map((step, idx) => (
          <div
            key={step.key}
            className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2"
          >
            <span
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors',
                step.status === 'done' &&
                  'border-primary bg-primary text-primary-foreground',
                step.status === 'active' &&
                  'border-primary bg-primary/10 text-primary',
                step.status === 'pending' &&
                  'border-border bg-muted text-muted-foreground',
              )}
              aria-hidden="true"
            >
              {step.status === 'done' ? (
                <Check className="h-3 w-3" strokeWidth={3} />
              ) : step.status === 'active' ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                idx + 1
              )}
            </span>
            <span
              className={cn(
                'truncate text-[11px] font-medium uppercase tracking-wider transition-colors sm:text-xs',
                step.status === 'done' && 'text-foreground',
                step.status === 'active' && 'text-primary',
                step.status === 'pending' && 'text-muted-foreground',
              )}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 h-0.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
