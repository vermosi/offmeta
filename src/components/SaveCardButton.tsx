/**
 * Save control for a card.
 *
 * Signed out: stashes the intent, asks for sign-in, and the save replays after
 * authentication (PendingSaveReplay). Signed in: toggles the save immediately.
 */

import { useCallback } from 'react';
import { Bookmark } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useSavedCards } from '@/hooks/useSavedCards';
import { requestSignIn, setPendingSave, type SavedCardInput } from '@/lib/account';
import { cn } from '@/lib/core/utils';
import { useTranslation } from '@/lib/i18n';

interface SaveCardButtonProps {
  card: SavedCardInput;
  className?: string;
  /** Compact icon-only variant used inside result grids. */
  size?: 'sm' | 'md';
}

export function SaveCardButton({ card, className, size = 'sm' }: SaveCardButtonProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isSaved, saveCard, removeCard } = useSavedCards();
  const saved = isSaved(card.oracleId);

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (!user) {
        setPendingSave({ type: 'card', card });
        requestSignIn(
          t('account.signInToSaveCard', 'Sign in to save {{name}} to your account.').replace(
            '{{name}}',
            card.cardName,
          ),
        );
        return;
      }

      if (saved) {
        removeCard.mutate(card.oracleId, {
          onSuccess: () => toast.success(t('account.cardRemoved', 'Removed from saved')),
          onError: () =>
            toast.error(t('account.saveFailed', "Couldn't update your saved cards")),
        });
        return;
      }

      saveCard.mutate(
        { card },
        {
          onSuccess: () => toast.success(t('account.cardSaved', 'Saved')),
          onError: () =>
            toast.error(t('account.saveFailed', "Couldn't update your saved cards")),
        },
      );
    },
    [card, removeCard, saveCard, saved, t, user],
  );

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={
        saved
          ? t('account.removeFromSaved', 'Remove from saved')
          : t('account.saveCard', 'Save card')
      }
      title={
        saved
          ? t('account.removeFromSaved', 'Remove from saved')
          : t('account.saveCard', 'Save card')
      }
      className={cn(
        'inline-flex min-h-9 min-w-9 items-center justify-center rounded-sm border border-border/60 bg-background/80 text-muted-foreground backdrop-blur transition-colors hover:text-foreground focus-ring',
        saved && 'border-primary/50 text-primary',
        size === 'md' && 'min-h-10 min-w-10',
        className,
      )}
    >
      <Bookmark
        className={cn('h-4 w-4', saved && 'fill-current')}
        aria-hidden="true"
      />
    </button>
  );
}
