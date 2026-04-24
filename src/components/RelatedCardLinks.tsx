/**
 * RelatedCardLinks — internal-link block shown at the bottom of card pages.
 *
 * Pulls "frequently played with" cards from the existing card_cooccurrence
 * data via the discovery service and renders them as crawlable <Link>s to
 * other /cards/:slug pages. The goal is purely SEO: build topical clusters
 * so Google can map relationships between card pages.
 *
 * Reuses the existing discovery pipeline — no new endpoints, no extra tables.
 */

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { getRelatedCards } from '@/services/discovery';
import { cardNameToSlug } from '@/lib/card-slug';

interface RelatedCardLinksProps {
  oracleId: string | null | undefined;
  cardName: string;
  /** Max links to render. Defaults to 6 — sweet spot for SEO without bloat. */
  limit?: number;
}

export function RelatedCardLinks({ oracleId, cardName, limit = 6 }: RelatedCardLinksProps) {
  const { data: related, isLoading } = useQuery({
    queryKey: ['related-card-links', oracleId, limit],
    queryFn: () => getRelatedCards(oracleId!, { limit }),
    enabled: !!oracleId,
    staleTime: 60 * 60 * 1000, // 1h — relationships change slowly
    gcTime: 6 * 60 * 60 * 1000,
  });

  if (!oracleId || isLoading) return null;

  // Filter out the card itself defensively + dedupe by name
  const seen = new Set<string>([cardName.toLowerCase()]);
  const links = (related ?? []).filter((r) => {
    const key = r.cardName.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);

  if (links.length === 0) return null;

  return (
    <section className="space-y-3" aria-label="Cards often played with this one">
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        Cards often played with {cardName}
      </h2>
      <ul className="flex flex-wrap gap-2">
        {links.map((rel) => (
          <li key={rel.oracleId}>
            <Link
              to={`/cards/${cardNameToSlug(rel.cardName)}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full
                border border-border/40 bg-card/50 hover:bg-primary/10 hover:border-primary/30
                text-sm text-muted-foreground hover:text-foreground transition-all"
              title={`See cards like ${rel.cardName}`}
            >
              {rel.cardName}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
