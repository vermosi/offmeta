/**
 * Popular Cards Strip — shows clickable card images above the fold
 * to give first-time visitors immediate visual engagement and reduce bounce rate.
 * Rotates daily from a curated list of popular Commander/MTG staples.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { cardNameToSlug } from '@/lib/card-slug';
import { Skeleton } from '@/components/ui/skeleton';
import { Compass } from 'lucide-react';

// Curated popular cards — mix of staples, hidden gems, and price-relevant cards
const POPULAR_CARDS = [
  'Sol Ring',
  'Rhystic Study',
  'Smothering Tithe',
  'Dockside Extortionist',
  'Cyclonic Rift',
  'Demonic Tutor',
  'Fierce Guardianship',
  'Esper Sentinel',
  'Teferi\'s Protection',
  'The Great Henge',
  'Craterhoof Behemoth',
  'Expropriate',
  'Mana Drain',
  'Doubling Season',
  'Ancient Tomb',
  'Jeweled Lotus',
  'Urza\'s Saga',
  'Sensei\'s Divining Top',
] as const;

const CARDS_TO_SHOW = 6;
const MOBILE_CARDS = 4;

interface CardPreview {
  name: string;
  image: string;
  price?: string;
}

async function fetchPopularCards(names: string[]): Promise<CardPreview[]> {
  // Batch fetch via Scryfall collection endpoint
  const identifiers = names.map((n) => ({ name: n }));
  const res = await fetch('https://api.scryfall.com/cards/collection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifiers }),
  });

  if (!res.ok) return [];
  const json = await res.json();

  return (json.data ?? []).map((card: Record<string, unknown>) => ({
    name: card.name as string,
    image:
      (card.image_uris as Record<string, string> | undefined)?.small ??
      ((card.card_faces as Array<Record<string, unknown>> | undefined)?.[0]
        ?.image_uris as Record<string, string> | undefined)?.small ??
      '',
    price: (card.prices as Record<string, string | null> | undefined)?.usd ?? undefined,
  }));
}

export function PopularCardsStrip() {
  // Pick cards based on day-of-year for daily rotation
  const selectedNames = useMemo(() => {
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
    );
    const start = (dayOfYear * 3) % POPULAR_CARDS.length;
    const names: string[] = [];
    for (let i = 0; i < CARDS_TO_SHOW; i++) {
      names.push(POPULAR_CARDS[(start + i) % POPULAR_CARDS.length]);
    }
    return names;
  }, []);

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['popular-cards-strip', selectedNames.join(',')],
    queryFn: () => fetchPopularCards(selectedNames),
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <section className="animate-fade-in">
        <div className="flex items-center gap-2 mb-3">
          <Compass className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="text-sm font-medium text-foreground">Explore popular cards</h2>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 sm:gap-3">
          {Array.from({ length: CARDS_TO_SHOW }).map((_, i) => (
            <Skeleton key={i} className={`aspect-[488/680] rounded-lg ${i >= MOBILE_CARDS ? 'hidden sm:block' : ''}`} />
          ))}
        </div>
      </section>
    );
  }

  if (cards.length === 0) return null;

  return (
    <section className="animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <Compass className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 className="text-sm font-medium text-foreground">Explore popular cards</h2>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 sm:gap-3">
        {cards.slice(0, CARDS_TO_SHOW).map((card, i) => (
          <Link
            key={card.name}
            to={`/cards/${cardNameToSlug(card.name)}`}
            className={`group relative rounded-lg overflow-hidden border border-border/30 hover:border-primary/50 transition-all hover:shadow-lg hover:scale-[1.03] ${
              i >= MOBILE_CARDS ? 'hidden sm:block' : ''
            }`}
          >
            {card.image ? (
              <img
                src={card.image}
                alt={card.name}
                className="w-full aspect-[488/680] object-cover"
                loading="lazy"
                width={146}
                height={204}
              />
            ) : (
              <div className="aspect-[488/680] bg-muted flex items-center justify-center text-xs text-muted-foreground p-2 text-center">
                {card.name}
              </div>
            )}
            {/* Overlay on hover */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent p-1.5 sm:p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-[10px] sm:text-xs font-medium text-foreground truncate">
                {card.name}
              </p>
              {card.price && (
                <p className="text-[9px] sm:text-[10px] text-muted-foreground">${card.price}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
