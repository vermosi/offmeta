/**
 * Manages SEO meta tags, JSON-LD structured data, and canonical URLs
 * for the search results page. Renders nothing visible.
 * @module components/SeoManager
 */

import { useEffect, useRef } from 'react';
import {
  applySeoMeta,
  buildCappedTitle,
  buildSearchCanonical,
  
  injectJsonLd,
  buildSearchResultsJsonLd,
  buildSeoTitle,
} from '@/lib/seo';
import { useTranslation } from '@/lib/i18n';
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

const OG_LOCALES: Record<string, string> = {
  en: 'en_US',
  es: 'es_ES',
  pt: 'pt_BR',
  fr: 'fr_FR',
  de: 'de_DE',
  it: 'it_IT',
  ru: 'ru_RU',
  ja: 'ja_JP',
  ko: 'ko_KR',
  zhs: 'zh_CN',
  zht: 'zh_TW',
};

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
  const { t, locale } = useTranslation();
  const ogLocale = OG_LOCALES[locale] ?? 'en_US';

  useEffect(() => {
    jsonLdCleanup.current?.();
    jsonLdCleanup.current = null;

    const canonicalUrl = compiledQuery
      ? buildSearchCanonical(compiledQuery)
      : 'https://offmeta.app/';

    // Homepage / pre-search state - restore the sitewide OG + Twitter defaults
    // so navigating back from a card or search page doesn't leave stale
    // per-route tags in the head (which would mis-attribute link previews).
    if (!hasSearched || isSearching) {
      applySeoMeta({
        title: t('searchSeo.homeTitle'),
        description: t('searchSeo.homeDescription'),

        url: 'https://offmeta.app/',
        type: 'website',
        image: 'https://offmeta.app/og-image.png',
        twitterCard: 'summary_large_image',
        locale: ogLocale,
      });
      return;
    }

    if (displayCards.length === 0) {
      const title = buildSeoTitle(
        t('searchSeo.noResultsTitle', { query: originalQuery }),
      );
      const desc = t('searchSeo.noResultsDescription', {
        query: originalQuery,
      });
      applySeoMeta({
        title,
        description: desc.slice(0, 160),
        url: canonicalUrl,
        type: 'website',
        image: 'https://offmeta.app/og-image.png',
        twitterCard: 'summary_large_image',
        locale: ogLocale,
        extraMeta: {
          'twitter:label1': t('searchSeo.labelResults'),
          'twitter:data1': t('searchSeo.dataCards', { count: 0 }),
          'twitter:label2': t('searchSeo.labelQuery'),
          'twitter:data2': originalQuery.slice(0, 60),
        },
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

    // SEO title + description - must stay within 60 chars including the
    // " | OffMeta" suffix that applySeoMeta appends.
    const MAX_TITLE = 60;
    const candidates = [
      t('searchSeo.resultsTitle', { query: originalQuery }),
      t('searchSeo.resultsTitleShort', { query: originalQuery }),
      originalQuery,
    ];
    const title =
      candidates
        .map((c) => buildSeoTitle(c))
        .find((c) => c.length <= MAX_TITLE) ??
      buildCappedTitle(originalQuery, ' | OffMeta', MAX_TITLE);

    const desc = t('searchSeo.resultsDescription', {
      count: totalCards,
      query: originalQuery,
    });
    applySeoMeta({
      title,
      description: desc.slice(0, 160),
      url: canonicalUrl,
      type: 'website',
      image: firstArt ?? 'https://offmeta.app/og-image.png',
      twitterCard: 'summary_large_image',
      locale: ogLocale,
      extraMeta: {
        'twitter:label1': t('searchSeo.labelResults'),
        'twitter:data1': t('searchSeo.dataCards', { count: totalCards }),
        'twitter:label2': t('searchSeo.labelQuery'),
        'twitter:data2': originalQuery.slice(0, 60),
      },
    });

    return () => {
      jsonLdCleanup.current?.();
      jsonLdCleanup.current = null;
    };
  }, [hasSearched, isSearching, displayCards, originalQuery, searchQuery, compiledQuery, totalCards, t, ogLocale]);


  return null;
}
