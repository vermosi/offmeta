/**
 * Save control for the current search, shown on the search desk.
 */

import { useCallback } from 'react';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useSavedSearches } from '@/hooks/useSavedSearches';
import { requestSignIn, setPendingSave } from '@/lib/account';
import { cn } from '@/lib/core/utils';
import { useTranslation } from '@/lib/i18n';

interface SaveSearchButtonProps {
  naturalQuery: string;
  scryfallQuery?: string | null;
  resultCount?: number | null;
  className?: string;
}

export function SaveSearchButton({
  naturalQuery,
  scryfallQuery,
  resultCount,
  className,
}: SaveSearchButtonProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isSearchSaved, saveSearch, savedSearches, removeSearch } = useSavedSearches();
  const saved = Boolean(naturalQuery) && isSearchSaved(naturalQuery);

  const handleClick = useCallback(() => {
    if (!naturalQuery.trim()) return;

    if (!user) {
      setPendingSave({
        type: 'search',
        naturalQuery,
        scryfallQuery: scryfallQuery ?? null,
        resultCount: resultCount ?? null,
      });
      requestSignIn(
        t('account.signInToSaveSearch', 'Sign in to keep this search in your account.'),
      );
      return;
    }

    if (saved) {
      const match = savedSearches.find(
        (s) => s.normalizedQuery === naturalQuery.trim().toLowerCase().replace(/\s+/g, ' '),
      );
      if (match) {
        removeSearch.mutate(match.id, {
          onSuccess: () =>
            toast.success(t('account.searchRemoved', 'Search removed')),
        });
      }
      return;
    }

    saveSearch.mutate(
      { naturalQuery, scryfallQuery: scryfallQuery ?? null, resultCount: resultCount ?? null },
      {
        onSuccess: () => toast.success(t('account.searchSaved', 'Search saved')),
        onError: () =>
          toast.error(t('account.saveSearchFailed', "Couldn't save this search")),
      },
    );
  }, [
    naturalQuery,
    removeSearch,
    resultCount,
    saveSearch,
    saved,
    savedSearches,
    scryfallQuery,
    t,
    user,
  ]);

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={saved}
      className={cn(
        'inline-flex min-h-9 items-center gap-2 rounded-sm border border-border/60 px-3 text-xs uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground focus-ring',
        saved && 'border-primary/50 text-primary',
        className,
      )}
    >
      <Star className={cn('h-3.5 w-3.5', saved && 'fill-current')} aria-hidden="true" />
      {saved
        ? t('account.searchSavedLabel', 'Saved')
        : t('account.saveSearch', 'Save search')}
    </button>
  );
}
