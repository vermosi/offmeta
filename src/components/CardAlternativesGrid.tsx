/**
 * Reusable grid for displaying card alternatives (off-meta, budget, etc.).
 */

import { Link } from 'react-router-dom';
import { cardNameToSlug } from '@/lib/card-slug';
import type { ScryfallCard } from '@/types/card';

interface CardAlternativesGridProps {
  cards: ScryfallCard[];
  maxCards?: number;
}

export function CardAlternativesGrid({ cards, maxCards = 8 }: CardAlternativesGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.slice(0, maxCards).map((alt) => (
        <Link
          key={alt.id}
          to={`/cards/${cardNameToSlug(alt.name)}`}
          className="group"
        >
          <div className="rounded-lg overflow-hidden border border-border/30 hover:border-primary/40 transition-all hover:shadow-lg">
            {alt.image_uris?.normal ? (
              <img
                src={alt.image_uris.normal}
                alt={alt.name}
                className="w-full"
                loading="lazy"
                width={488}
                height={680}
              />
            ) : (
              <div className="aspect-[488/680] bg-muted flex items-center justify-center text-sm text-muted-foreground p-4 text-center">
                {alt.name}
              </div>
            )}
          </div>
          <p className="mt-1.5 text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
            {alt.name}
          </p>
          {alt.prices?.usd && (
            <p className="text-xs text-muted-foreground">${alt.prices.usd}</p>
          )}
        </Link>
      ))}
    </div>
  );
}
