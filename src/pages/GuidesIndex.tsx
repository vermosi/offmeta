/**
 * OffMeta Field Guide index — editorial table of contents for all guides.
 */

import { useEffect, useState } from 'react';
import { applySeoMeta, injectJsonLd, buildBreadcrumbJsonLd } from '@/lib/seo';
import { Link } from 'react-router-dom';
import { GUIDES } from '@/data/guides';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { ScrollToTop } from '@/components/ScrollToTop';
import { useTranslation } from '@/lib/i18n';
import { SkipLinks } from '@/components/SkipLinks';
import { useToast } from '@/hooks';
import { buildGuideUrl, copyTextToClipboard } from '@/lib/guide-actions';

const LEVEL_GROUPS = [
  { key: 'beginner', label: 'guides.levelBeginner', min: 1, max: 3 },
  { key: 'intermediate', label: 'guides.levelIntermediate', min: 4, max: 6 },
  { key: 'advanced', label: 'guides.levelAdvanced', min: 7, max: 8 },
  { key: 'expert', label: 'guides.levelExpert', min: 9, max: 11 },
] as const;

const GUIDE_FILTERS = [
  { key: 'all', label: 'guides.filterAll', min: 1, max: 11 },
  { key: 'beginner', label: 'guides.levelBeginner', min: 1, max: 3 },
  { key: 'intermediate', label: 'guides.levelIntermediate', min: 4, max: 6 },
  { key: 'advanced', label: 'guides.levelAdvanced', min: 7, max: 8 },
  { key: 'expert', label: 'guides.levelExpert', min: 9, max: 11 },
] as const;

const pad = (value: number) => String(value).padStart(2, '0');

export default function GuidesIndex() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeFilter, setActiveFilter] =
    useState<(typeof GUIDE_FILTERS)[number]['key']>('all');

  const copyGuideQuery = async (slug: string, title: string) => {
    await copyTextToClipboard(
      GUIDES.find((guide) => guide.slug === slug)?.searchQuery ??
        buildGuideUrl(slug),
      toast,
      t('guides.copied', 'Copied'),
      t('guides.copiedQueryDesc', 'Copied {title} query to your clipboard.', { title }),
      t('guide.copyFailed', 'Copy failed'),
      t('guide.clipboardBlocked', 'Your browser blocked clipboard access.'),
    );
  };

  useEffect(() => {
    const cleanupMeta = applySeoMeta({
      title: t(
        'guides.seoTitle',
        'MTG Search Guides — Learn to Find Any Magic Card | OffMeta',
      ),
      description: t(
        'guides.seoDescription',
        'Learn how to find Magic cards faster with 10 progressive OffMeta guides, from tribe searches and budget filters to advanced multi-constraint queries.',
      ),
      url: 'https://offmeta.app/guides',
      type: 'website',
      section: 'Guides',
      keywords: [
        'MTG search guides',
        'Magic: The Gathering search',
        'Scryfall alternatives',
        'natural language MTG search',
        'find Magic cards by tribe',
        'budget MTG search',
        'MTG deckbuilding guides',
        'find MTG cards',
        'OffMeta guides',
      ],
    });

    const sortedGuides = [...GUIDES].sort((a, b) => a.level - b.level);
    const cleanupLd = injectJsonLd({
      '@context': 'https://schema.org',
      '@graph': [
        buildBreadcrumbJsonLd([
          { name: 'OffMeta', url: 'https://offmeta.app/' },
          { name: 'Guides', url: 'https://offmeta.app/guides' },
        ]),
        {
          '@type': 'CollectionPage',
          '@id': 'https://offmeta.app/guides#collection',
          name: 'MTG Search Guides',
          description:
            '10 progressive guides teaching natural-language Magic: The Gathering card search on OffMeta.',
          url: 'https://offmeta.app/guides',
          inLanguage: 'en',
          isPartOf: {
            '@type': 'WebSite',
            name: 'OffMeta',
            url: 'https://offmeta.app/',
          },
        },
        {
          '@type': 'ItemList',
          name: 'OffMeta Search Guides',
          numberOfItems: sortedGuides.length,
          itemListOrder: 'https://schema.org/ItemListOrderAscending',
          itemListElement: sortedGuides.map((g, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `https://offmeta.app/guides/${g.slug}`,
            name: g.title,
          })),
        },
      ],
    });

    return () => {
      cleanupLd();
      cleanupMeta();
    };
  }, [t]);

  const sorted = [...GUIDES].sort((a, b) => a.level - b.level);
  const activeBounds =
    GUIDE_FILTERS.find((filter) => filter.key === activeFilter) ??
    GUIDE_FILTERS[0];

  const grouped = LEVEL_GROUPS.map((group, groupIndex) => ({
    ...group,
    section: pad(groupIndex + 1),
    guides: sorted.filter(
      (guide) =>
        guide.level >= group.min &&
        guide.level <= group.max &&
        guide.level >= activeBounds.min &&
        guide.level <= activeBounds.max,
    ),
  })).filter((group) => group.guides.length > 0);

  return (
    <div className="flex min-h-screen min-h-dvh flex-col overflow-x-hidden bg-background">
      <SkipLinks />
      <Header />

      <main id="main-content" className="container-main w-full min-w-0 flex-1 pb-16 pt-8">
        <nav aria-label="Breadcrumb" className="mb-10">
          <ol className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            <li>
              <Link to="/" className="transition-colors hover:text-foreground">
                {t('landing.offMeta', 'OffMeta')}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-foreground">{t('guides.fieldGuide', 'Field Guide')}</li>
          </ol>
        </nav>

        <header className="border-b border-border/60 pb-10">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <h1 className="font-display text-[clamp(2.25rem,5.2vw,4rem)] font-extrabold uppercase leading-[0.88] tracking-tight text-foreground lg:col-span-7">
              {t('guides.learnToFind', 'Learn to find')}
              <br />
              <span className="font-editorial text-[0.94em] font-normal normal-case italic tracking-normal text-accent">
                {t('guides.anythingInMagic', 'anything in Magic.')}
              </span>
            </h1>
            <div className="space-y-4 lg:col-span-5 lg:pb-2">
              <p className="max-w-md text-base leading-snug text-muted-foreground">
                {t('guides.pageSubtitle')}
              </p>
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                {t('guides.countBeginnerExpert', '{count} Guides / Beginner → Expert', { count: GUIDES.length })}
              </p>
            </div>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-border/60 py-4">
          {GUIDE_FILTERS.map((filter) => {
            const isActive = activeFilter === filter.key;
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                aria-pressed={isActive}
                className={`inline-flex min-h-9 items-center font-mono text-[11px] uppercase tracking-[0.26em] underline-offset-[6px] transition-colors ${
                  isActive
                    ? 'text-foreground underline decoration-accent decoration-2'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t(filter.label)}
              </button>
            );
          })}
        </div>

        <div className="mt-12 space-y-14">
          {grouped.map((group) => (
            <section key={group.key} id={group.key} aria-labelledby={`${group.key}-title`}>
              <div className="flex items-baseline gap-4">
                <span className="font-mono text-[11px] tracking-[0.28em] text-muted-foreground">
                  {group.section} /
                </span>
                <h2
                  id={`${group.key}-title`}
                  className="font-display text-lg font-extrabold uppercase tracking-tight text-foreground"
                >
                  {t(group.label)}
                </h2>
                <span className="font-mono text-[10px] tracking-[0.24em] text-muted-foreground">
                  {t('guides.guidesCount', '{count} GUIDES', { count: group.guides.length })}
                </span>
              </div>

              <ul className="mt-4">
                {group.guides.map((guide, index) => (
                  <li
                    key={guide.slug}
                    className="border-b border-border/50 py-6 first:border-t"
                  >
                    <div className="grid min-w-0 gap-4 lg:grid-cols-12 lg:items-start">
                      <span className="font-mono text-[11px] tracking-[0.24em] text-muted-foreground lg:col-span-1">
                        {group.section}.{pad(index + 1)}
                      </span>

                      <div className="min-w-0 lg:col-span-7">
                        <Link
                          to={`/guides/${guide.slug}`}
                          className="font-display text-base font-bold uppercase tracking-tight text-foreground underline-offset-[6px] hover:underline sm:text-lg"
                        >
                          {t(`guide.title.${guide.slug}`, guide.title)}
                        </Link>
                        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
                          {t(`guide.sub.${guide.slug}`, guide.subheading)}
                        </p>
                      </div>

                      <div className="flex min-w-0 flex-col gap-1.5 lg:col-span-4 lg:items-end">
                        <Link
                          to={`/search/${encodeURIComponent(guide.searchQuery)}`}
                          className="block max-w-full truncate font-mono text-[11px] tracking-[0.16em] text-foreground underline decoration-border underline-offset-[6px] transition-colors hover:decoration-foreground"
                        >
                          {t('guides.tryQuery', 'TRY → "{query}"', { query: guide.searchQuery })}
                        </Link>
                        <div className="flex items-center gap-5 lg:justify-end">
                          <Link
                            to={`/guides/${guide.slug}`}
                            className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground transition-colors hover:text-foreground"
                          >
                            {t('guides.readGuideArrow', 'Read guide →')}
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              void copyGuideQuery(guide.slug, guide.title);
                            }}
                            className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground/70 transition-colors hover:text-foreground"
                          >
                            {t('guides.copyQuery', 'Copy query')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section className="mt-16 border-t border-border/60 pt-10">
          <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
            <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight text-foreground lg:col-span-7">
              {t('guides.readyToSearch')}
            </h2>
            <div className="lg:col-span-5">
              <p className="text-sm text-muted-foreground">
                {t('guides.readyToSearchDesc')}
              </p>
              <Link
                to="/"
                className="mt-4 inline-block font-mono text-[11px] uppercase tracking-[0.26em] text-foreground underline decoration-border underline-offset-[6px] transition-colors hover:decoration-foreground"
              >
                {t('guides.startSearching')} →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <ScrollToTop threshold={400} />
    </div>
  );
}
