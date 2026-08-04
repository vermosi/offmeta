/**
 * Rarity badge variant mapping shared across card UI.
 * @module components/CardModal/rarity
 */

import type { BadgeProps } from '@/components/ui/badge';

export function getRarityVariant(rarity: string): BadgeProps['variant'] {

  switch (rarity) {
    case 'mythic':
      return 'mythic';
    case 'rare':
      return 'rare';
    case 'uncommon':
      return 'uncommon';
    case 'common':
      return 'common';
    default:
      return 'secondary';
  }
}
