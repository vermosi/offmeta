/**
 * Composable renderer for a LandingPageConfig.
 * Sections are optional: a config that omits a section simply doesn't render
 * it, so pages don't all look identical.
 */

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SkipLinks } from '@/components/SkipLinks';
import { PageSearchBar } from '@/components/PageSearchBar';
import { applySeoMeta, buildBreadcrumbJsonLd, injectJsonLd } from '@/lib/seo';
import type { LandingPageConfig } from '@/lib/landing/types';
import { getLandingPage } from '@/lib/landing/registry';
import { useTranslation } from '@/lib/i18n';
import {
  AdjacentConcepts,
  EditorialExplanation,
  EditorialHero,
  IndexHeader,
  IntentPaths,
  RelatedIndexPages,
  RelatedSearches,
} from './LandingPrimitives';
import { searchHref } from '@/lib/landing/searchHref';
import { RepresentativeResults } from './RepresentativeResults';

const SITE = 'https://offmeta.app';

function buildCrumbs(config: LandingPageConfig, t: (key: string, fallback?: string) => string) {
  const segments = config.path.split('/').filter(Boolean);
  const crumbs: Array<{ label: string; href?: string }> = [];

  if (segments.length > 1) {
    const root = segments[0];
    crumbs.push({
      label:
        root === 'mtg'
          ? t('landing.cardIndex', 'Card index')
          : root.replace(/-/g, ' '),
      // Only link the parent when a real page exists there.
      href: getLandingPage(`/${root}`) ? `/${root}` : undefined,
    });
  }
  crumbs.push({ label: config.breadcrumbLabel, href: config.path });
  return crumbs;
}

export function LandingPageView({ config }: { config: LandingPageConfig }) {
  const { t } = useTranslation();
  const url = `${SITE}${config.path}`;

  useEffect(() => {
    const cleanupSeo = applySeoMeta({
      title: config.title,
      description: config.description,
      url,
      type: 'website',
      extraMeta: config.indexable
        ? undefined
        : { robots: 'noindex, follow' },
    });

    const crumbs = buildCrumbs(config, t);
    const cleanupLd = injectJsonLd({
      '@context': 'https://schema.org',
      '@graph': [
        buildBreadcrumbJsonLd([
          { name: 'OffMeta', url: `${SITE}/` },
          ...crumbs.map((crumb) => ({
            name: crumb.label,
            url: `${SITE}${crumb.href ?? config.path}`,
          })),
        ]),
        {
          '@type': 'CollectionPage',
          name: config.title,
          description: config.description,
          url,
          inLanguage: 'en',
          isPartOf: { '@type': 'WebSite', name: 'OffMeta', url: `${SITE}/` },
          // The curated intent paths are the page's real content — expose
          // them so the CollectionPage is not an empty shell.
          mainEntity: {
            '@type': 'ItemList',
            name: config.intentPathsTitle ?? t('landing.explore', 'Explore'),
            numberOfItems: config.intentPaths.length,
            itemListElement: config.intentPaths.map((path, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: path.label,
              description: path.description,
              url: `${SITE}/?q=${encodeURIComponent(path.query)}`,
            })),
          },
        },
      ],

    });

    return () => {
      cleanupSeo();
      cleanupLd();
    };
  }, [config, url, t]);

  const indexLine = ['OffMeta', ...config.indexTrail].join(' / ');

  return (
    <div className="flex min-h-screen min-h-dvh flex-col bg-background">
      <SkipLinks />
      <Header />

      <main id="main-content" className="container-main flex-1 pb-16">
        <IndexHeader trail={config.indexTrail} crumbs={buildCrumbs(config, t)} />

        <EditorialHero
          headline={config.headline}
          emphasis={config.headlineEmphasis}
          lede={config.lede}
          meta={indexLine.toUpperCase()}
        />

        {/* 03 — contextual search: the primary interaction stays search. */}
        <section className="border-b border-border/50 py-8" aria-label="Search">
          <PageSearchBar
            initialValue={config.searchQuery}
            placeholder={config.searchQuery}
            size="lg"
          />
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
            {t('landing.editQueryHint', 'Edit the query, or start from a path below')}
          </p>
        </section>

        <IntentPaths
          title={config.intentPathsTitle ?? t('landing.explore', 'Explore')}
          paths={config.intentPaths}
        />

        {config.representativeQuery ? (
          <RepresentativeResults
            query={config.representativeQuery}
            label={
              config.representativeLabel ??
              t('landing.representativeResults', 'Representative results')
            }
            intentPaths={config.intentPaths}
            summaryTopic={config.summaryTopic ?? config.breadcrumbLabel}
          />
        ) : null}

        {config.explanation ? (
          <EditorialExplanation
            title={config.explanation.title}
            paragraphs={config.explanation.paragraphs}
          />
        ) : null}

        {config.adjacentConcepts?.length ? (
          <AdjacentConcepts concepts={config.adjacentConcepts} />
        ) : config.relatedSearches?.length ? (
          <RelatedSearches queries={config.relatedSearches} />
        ) : null}

        {config.relatedPages?.length ? (
          <RelatedIndexPages pages={config.relatedPages} />
        ) : null}

        {/* 09 — search again. */}
        <section className="py-10">
          <h2 className="font-display text-xl font-extrabold uppercase tracking-tight text-foreground">
            {t('landing.searchAgain', 'Search again')}
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            {t(
              'landing.searchAgainDesc',
              'Describe what your deck needs. OffMeta shows the Scryfall query it ran, so you can keep refining it.',
            )}
          </p>
          <Link
            to={searchHref(config.searchQuery)}
            className="mt-4 inline-block font-mono text-[11px] uppercase tracking-[0.26em] text-foreground underline decoration-border underline-offset-[6px] transition-colors hover:decoration-foreground"
          >
            {t('landing.runQuery', 'Run "{query}" →', { query: config.searchQuery })}
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}
