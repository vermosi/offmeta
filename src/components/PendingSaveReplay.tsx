/**
 * Replays a save that was attempted while signed out, once a session exists.
 */

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useSavedCards } from '@/hooks/useSavedCards';
import { useSavedSearches } from '@/hooks/useSavedSearches';
import { takePendingSave } from '@/lib/account';
import { useTranslation } from '@/lib/i18n';

export function PendingSaveReplay() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { saveCard } = useSavedCards();
  const { saveSearch } = useSavedSearches();
  const replayedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      replayedFor.current = null;
      return;
    }
    if (replayedFor.current === user.id) return;
    replayedFor.current = user.id;

    const pending = takePendingSave();
    if (!pending) return;

    if (pending.type === 'card') {
      saveCard.mutate(
        { card: pending.card },
        {
          onSuccess: () =>
            toast.success(
              t('account.cardSavedNamed', 'Saved {{name}}').replace(
                '{{name}}',
                pending.card.cardName,
              ),
            ),
          onError: () =>
            toast.error(t('account.saveFailed', "Couldn't update your saved cards")),
        },
      );
      return;
    }

    saveSearch.mutate(
      {
        naturalQuery: pending.naturalQuery,
        scryfallQuery: pending.scryfallQuery ?? null,
        resultCount: pending.resultCount ?? null,
      },
      {
        onSuccess: () => toast.success(t('account.searchSaved', 'Search saved')),
        onError: () =>
          toast.error(t('account.saveSearchFailed', "Couldn't save this search")),
      },
    );
  }, [saveCard, saveSearch, t, user]);

  return null;
}
