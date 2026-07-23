/**
 * Manages SEO meta tags, JSON-LD structured data, and canonical URLs
 * for the search results page. Renders nothing visible.
 * @module components/SeoManager
 */

import { useEffect, useRef } from 'react';
import {
  applySeoMeta,
  buildSearchCanonical,
  injectJsonLd,
  buildSearchResultsJsonLd,
} from '@/lib/seo';
import type { ScryfallCard } from '@/types/card';

interface SeoManagerProps {
  hasSearched: boolean;
  isSearching: boolean;
  displayCards: ScryfallCard[];
  originalQuery: string;
  searchQuery: string;
  compiledQuery: string | undefined;
  totalCards: number;
}

export function SeoManager({
  hasSearched,
  isSearching,
  displayCards,
  originalQuery,
  searchQuery,
  compiledQuery,
  totalCards,
}: SeoManagerProps) {
  const jsonLdCleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    jsonLdCleanup.current?.();
    jsonLdCleanup.current = null;

    // Homepage / pre-search state — restore the sitewide OG + Twitter defaults
    // so navigating back from a card or search page doesn't leave stale
    // per-route tags in the head (which would mis-attribute link previews).
    if (!hasSearched || isSearching || displayCards.length === 0) {
      applySeoMeta({
        title: 'Natural Language MTG Card Search | OffMeta',
        description:
          'Search Magic: The Gathering cards in plain English. Type what you mean and get real Scryfall results.',
        url: 'https://offmeta.app/',
        type: 'website',
        image: 'https://offmeta.app/og-image.png',
        twitterCard: 'summary_large_image',
      });
      return;
    }

    // Inject ItemList JSON-LD for AEO
    jsonLdCleanup.current = injectJsonLd(
      buildSearchResultsJsonLd(displayCards, originalQuery),
    );

    // Dynamic OG image: use first card's art crop
    const firstArt =
      displayCards[0]?.image_uris?.art_crop ??
      displayCards[0]?.card_faces?.[0]?.image_uris?.art_crop;

    // Canonical dedup: base canonical on compiled Scryfall query slug
    const canonicalUrl = compiledQuery
      ? buildSearchCanonical(compiledQuery)
      : 'https://offmeta.app/';

    // SEO title + description — must stay within 60 chars including suffix.
    const MAX_TITLE = 60;
    const candidates = [
      `${originalQuery} — MTG Card Search | OffMeta`,
      `${originalQuery} — MTG Search | OffMeta`,
      `${originalQuery} — OffMeta`,
      `${originalQuery}`,
    ];
    let title = candidates.find((c) => c.length <= MAX_TITLE) ?? candidates[candidates.length - 1];
    if (title.length > MAX_TITLE) {
      const suffix = ' | OffMeta';
      const budget = MAX_TITLE - suffix.length - 1;
      title = `${originalQuery.slice(0, Math.max(1, budget)).trimEnd()}…${suffix}`;
    }
    const desc = `Find ${totalCards} Magic: The Gathering cards matching "${originalQuery}" — off-meta picks, alternatives & synergies.`;
    applySeoMeta({
      title,
      description: desc.slice(0, 160),
      url: canonicalUrl,
      type: 'website',
      image: firstArt ?? 'https://offmeta.app/og-image.png',
      twitterCard: 'summary_large_image',
      extraMeta: {
        'twitter:label1': 'Results',
        'twitter:data1': `${totalCards} cards`,
        'twitter:label2': 'Query',
        'twitter:data2': originalQuery.slice(0, 60),
      },
    });

    return () => {
      jsonLdCleanup.current?.();
      jsonLdCleanup.current = null;
    };
  }, [hasSearched, isSearching, displayCards, originalQuery, searchQuery, compiledQuery, totalCards]);

  return null;
}
