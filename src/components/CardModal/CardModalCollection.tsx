/**
 * Collection controls for the CardModal.
 * Shows owned quantity with +/- buttons for authenticated users.
 */

import { memo } from 'react';
import { Plus, Minus, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import {
  useCollectionCard,
  useAddToCollection,
  useRemoveFromCollection,
  useUpdateCollectionQuantity,
} from '@/hooks/useCollection';
import { useTranslation } from '@/lib/i18n';

interface CardModalCollectionProps {
  cardName: string;
  scryfallId?: string;
  isMobile?: boolean;
}

export const CardModalCollection = memo(function CardModalCollection({
  cardName,
  isMobile,
}: CardModalCollectionProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const entries = useCollectionCard(cardName);
  const addToCollection = useAddToCollection();
  const removeFromCollection = useRemoveFromCollection();
  const updateQuantity = useUpdateCollectionQuantity();

  if (!user) return null;

  const totalOwned = entries.reduce((sum, e) => sum + e.quantity, 0);
  const primaryEntry = entries[0];

  const handleIncrement = () => {
    if (primaryEntry) {
      updateQuantity.mutate({ id: primaryEntry.id, quantity: primaryEntry.quantity + 1 });
    } else {
      addToCollection.mutate({ cardName });
    }
  };

  const handleDecrement = () => {
    if (!primaryEntry) return;
    if (primaryEntry.quantity <= 1) {
      removeFromCollection.mutate(primaryEntry.id);
    } else {
      updateQuantity.mutate({ id: primaryEntry.id, quantity: primaryEntry.quantity - 1 });
    }
  };

  const isLoading = addToCollection.isPending || removeFromCollection.isPending || updateQuantity.isPending;

  return (
    <div className={`flex items-center gap-2 ${isMobile ? 'py-2' : 'py-1'}`}>
      <Package className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-xs font-medium text-muted-foreground">
        {t('card.ownedQuantity', 'Owned')}:
      </span>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-6 w-6"
          onClick={handleDecrement}
          disabled={totalOwned === 0 || isLoading}
          aria-label={t('card.removeFromCollection', 'Remove from collection')}
        >
          <Minus className="h-3 w-3" />
        </Button>

        <span className="text-sm font-semibold tabular-nums min-w-[1.5rem] text-center">
          {totalOwned}
        </span>

        <Button
          variant="outline"
          size="icon"
          className="h-6 w-6"
          onClick={handleIncrement}
          disabled={isLoading}
          aria-label={t('card.addToCollection', 'Add to collection')}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
});
