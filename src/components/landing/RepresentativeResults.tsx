/**
 * 05 — representative results.
 *
 * Shows a handful of real cards for the page topic so the page is visibly
 * about Magic cards and the artwork carries the colour. Deliberately labelled
 * "representative", never "best" — there is no ranking data behind it.
 */

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { searchCards, getCardImage } from '@/lib/scryfall';
import { cardNameToSlug } from '@/lib/card-slug';
import { logger } from '@/lib/core/logger';

const MAX_CARDS = 6;

export function RepresentativeResults({
  query,
  label = 'Representative results',
}: {
  query: string;
  label?: string;
}) {
  // Popularity ordering keeps these recognisable rather than alphabetical.
  const orderedQuery = /\border:/.test(query) ? query : `${query} order:edhrec`;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['landing-representative', orderedQuery],
    queryFn: async () => {
      const result = await searchCards(orderedQuery);
      return result.data.slice(0, MAX_CARDS);
    },
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });


  if (isError) {
    logger.debug?.('[Landing] representative results unavailable', { query });
    return null;
  }

  if (!isLoading && (!data || data.length === 0)) return null;

  return (
    <section className="border-b border-border/50 py-10">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        {label}
      </h2>

      <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {isLoading
          ? Array.from({ length: MAX_CARDS }).map((_, index) => (
              <li
                key={index}
                aria-hidden="true"
                className="aspect-[488/680] animate-pulse bg-muted/40"
              />
            ))
          : data?.map((card) => (
              <li key={card.id}>
                <Link
                  to={`/cards/${cardNameToSlug(card.name)}`}
                  className="group block"
                >
                  <img
                    src={getCardImage(card, 'normal')}
                    alt={card.name}
                    width={488}
                    height={680}
                    loading="lazy"
                    decoding="async"
                    className="w-full rounded-[4px] transition-opacity group-hover:opacity-85"
                  />
                  <span className="mt-2 block truncate font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground group-hover:text-foreground">
                    {card.name}
                  </span>
                </Link>
              </li>
            ))}
      </ul>
    </section>
  );
}
