/**
 * Card image display component for CardModal.
 * Handles double-faced card transformation animation.
 * @module components/CardModal/CardModalImage
 */

import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import type { CardModalImageProps } from './types';
import { useTranslation } from '@/lib/i18n';

export function CardModalImage({
  displayImageUrl,
  cardName,
  isDoubleFaced,
  isFlipping,
  onTransform,
  isMobile = false,
}: CardModalImageProps) {
  const { t } = useTranslation();
  const maxWidth = isMobile ? 'max-w-[180px]' : 'max-w-[220px]';

  return (
    <div className="flex flex-col items-center w-full">
      <div className={cn('relative w-full', maxWidth)}>
        <img
          src={displayImageUrl}
          alt={cardName}
          className={cn(
            'rounded-xl shadow-lg w-full transition-transform duration-300',
            isFlipping && 'scale-x-0',
          )}
        />
      </div>

      {isDoubleFaced && (
        <Button
          variant="outline"
          size="sm"
          className={cn('gap-2 mt-3 w-full', maxWidth)}
          onClick={onTransform}
        >
          <RefreshCw
            className={cn('h-3.5 w-3.5', isFlipping && 'animate-spin')}
          />
          {t('card.transform', 'Transform')}
        </Button>
      )}
    </div>
  );
}
