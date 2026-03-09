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

    if (!hasSearched || isSearching || displayCards.length === 0) return;

    // Inject ItemList JSON-LD for AEO
    jsonLdCleanup.current = injectJsonLd(
      buildSearchResultsJsonLd(displayCards, originalQuery),
    );

    // Dynamic OG image: use first card's art crop
    const firstArt =
      displayCards[0]?.image_uris?.art_crop ??
      displayCards[0]?.card_faces?.[0]?.image_uris?.art_crop;
    if (firstArt) {
      let ogImg = document.querySelector(
        'meta[property="og:image"]',
      ) as HTMLMetaElement | null;
      if (!ogImg) {
        ogImg = document.createElement('meta');
        ogImg.setAttribute('property', 'og:image');
        document.head.appendChild(ogImg);
      }
      ogImg.content = firstArt;
    }

    // Canonical dedup: base canonical on compiled Scryfall query slug
    const canonicalUrl = compiledQuery
      ? buildSearchCanonical(compiledQuery)
      : 'https://offmeta.app/';

    // SEO title + description
    const desc = `Find ${totalCards} Magic: The Gathering cards matching "${originalQuery}" — off-meta picks, alternatives & synergies.`;
    applySeoMeta({
      title: `${originalQuery} — MTG Card Search | OffMeta`,
      description: desc.slice(0, 160),
      url: canonicalUrl,
      type: 'website',
      image: displayCards[0]?.image_uris?.art_crop,
    });

    return () => {
      jsonLdCleanup.current?.();
      jsonLdCleanup.current = null;
    };
  }, [hasSearched, isSearching, displayCards, originalQuery, searchQuery, compiledQuery, totalCards]);

  return null;
}
