/**
 * 05 — representative results.
 *
 * Shows real cards for the page topic so the artwork carries the colour, and
 * labels each one with the intent taxonomy of the page. Cards that cannot be
 * classified against that taxonomy are dropped rather than shown unlabelled:
 * four defensible examples beat six weak ones. Counts shown in the technical
 * summary are measured from the fetched result set, never estimated.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { searchCards, getCardImage } from '@/lib/scryfall';
import { cardNameToSlug } from '@/lib/card-slug';
import { logger } from '@/lib/core/logger';
import { classifyResults } from '@/lib/landing/classify';
import { TechnicalSummary } from './LandingPrimitives';
import type { IntentPath } from '@/lib/landing/types';

const MAX_CARDS = 6;
/** Below this, an unclassified fallback row is preferable to a stub. */
const MIN_CLASSIFIED = 3;

export function RepresentativeResults({
  query,
  label = 'Representative results',
  intentPaths = [],
  summaryTopic,
}: {
  query: string;
  label?: string;
  intentPaths?: readonly IntentPath[];
  /** Topic token for the technical summary, e.g. "TREASURE HATE". */
  summaryTopic?: string;
}) {
  // Popularity ordering keeps these recognisable rather than alphabetical.
  const orderedQuery = /\border:/.test(query) ? query : `${query} order:edhrec`;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['landing-representative', orderedQuery],
    queryFn: async () => {
      const result = await searchCards(orderedQuery);
      return result.data;
    },
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });

  const { cards, matchCount, scannedCount } = useMemo(() => {
    const results = data ?? [];
    const classification = classifyResults(results, intentPaths, MAX_CARDS);

    if (classification.selected.length >= MIN_CLASSIFIED) {
      return {
        cards: classification.selected,
        matchCount: classification.matchCount,
        scannedCount: classification.scannedCount,
      };
    }

    // No usable taxonomy for this page: fall back to a short unlabelled row.
    return {
      cards: results.slice(0, 4).map((card) => ({
        card,
        label: null,
        intentIndex: -1,
      })),
      matchCount: 0,
      scannedCount: results.length,
    };
  }, [data, intentPaths]);

  if (isError) {
    logger.debug?.('[Landing] representative results unavailable', { query });
    return null;
  }

  if (!isLoading && cards.length === 0) return null;

  const summaryParts: string[] = [];
  if (summaryTopic) summaryParts.push(summaryTopic);
  if (intentPaths.length > 0) {
    summaryParts.push(`${intentPaths.length} approaches`);
  }
  if (matchCount > 0) {
    summaryParts.push(
      `${matchCount} strong ${matchCount === 1 ? 'match' : 'matches'}`,
    );
  }

  return (
    <>
      {!isLoading && summaryParts.length > 1 ? (
        <TechnicalSummary parts={summaryParts} />
      ) : null}

      <section className="border-b border-border/50 py-10">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          {label}
        </h2>

        <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {isLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <li
                  key={index}
                  aria-hidden="true"
                  className="aspect-[488/680] animate-pulse bg-muted/40"
                />
              ))
            : cards.map(({ card, label: intentLabel }) => (
                <li key={card.id}>
                  <Link
                    to={`/cards/${cardNameToSlug(card.name)}`}
                    className="group block outline-none"
                  >
                    <img
                      src={getCardImage(card, 'normal')}
                      alt={card.name}
                      width={488}
                      height={680}
                      loading="lazy"
                      decoding="async"
                      className="w-full rounded-[4px] transition-opacity group-hover:opacity-85 group-focus-visible:opacity-85"
                    />
                    <span className="mt-2 block truncate font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors group-hover:text-foreground group-focus-visible:text-foreground">
                      {card.name}
                    </span>
                    {intentLabel ? (
                      <span className="mt-1 block truncate font-mono text-[9px] uppercase tracking-[0.26em] text-accent/80">
                        {intentLabel}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
        </ul>
      </section>
    </>
  );
}
