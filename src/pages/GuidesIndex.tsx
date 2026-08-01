/**
 * Root guides index page - lists all 10 guides as visual cards.
 */

import { useEffect, useState } from 'react';
import { applySeoMeta, injectJsonLd, buildBreadcrumbJsonLd } from '@/lib/seo';
import { Link } from 'react-router-dom';
import { GUIDES } from '@/data/guides';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { ScrollToTop } from '@/components/ScrollToTop';
import { BookOpen, ArrowRight, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n';
import { SkipLinks } from '@/components/SkipLinks';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks';
import { Copy, Share2 } from 'lucide-react';
import { buildGuideUrl, copyTextToClipboard } from '@/lib/guide-actions';

const LEVEL_COLORS: Record<string, string> = {
  'guides.levelBeginner': 'bg-success/10 text-success border-success/20',
  'guides.levelIntermediate': 'bg-info/10 text-info border-info/20',
  'guides.levelAdvanced': 'bg-warning/10 text-warning border-warning/20',
  'guides.levelExpert': 'bg-accent/10 text-accent border-accent/20',
};

const LEVEL_GROUPS = [
  {
    key: 'guides.levelBeginner',
    label: 'guides.levelBeginner',
    min: 1,
    max: 3,
  },
  {
    key: 'guides.levelIntermediate',
    label: 'guides.levelIntermediate',
    min: 4,
    max: 6,
  },
  {
    key: 'guides.levelAdvanced',
    label: 'guides.levelAdvanced',
    min: 7,
    max: 8,
  },
  { key: 'guides.levelExpert', label: 'guides.levelExpert', min: 9, max: 10 },
] as const;

const GUIDE_FILTERS = [
  { key: 'all', label: 'All guides', min: 1, max: 10 },
  { key: 'beginner', label: 'Beginner', min: 1, max: 3 },
  { key: 'intermediate', label: 'Intermediate', min: 4, max: 6 },
  { key: 'advanced', label: 'Advanced', min: 7, max: 8 },
  { key: 'expert', label: 'Expert', min: 9, max: 10 },
] as const;

export default function GuidesIndex() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeFilter, setActiveFilter] = useState<(typeof GUIDE_FILTERS)[number]['key']>('all');

  const copyGuideUrl = async (slug: string, title: string) => {
    await copyTextToClipboard(
      GUIDES.find((guide) => guide.slug === slug)?.searchQuery ?? buildGuideUrl(slug),
      toast,
      'Link copied',
      `Copied ${title} to your clipboard.`,
      'Copy failed',
      'Your browser blocked clipboard access.',
    );
  };

  const shareGuide = async (slug: string, title: string) => {
    const url = buildGuideUrl(slug);
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Fall through to clipboard.
      }
    }

    await copyTextToClipboard(
      url,
      toast,
      'Link copied',
      `Copied ${title} to your clipboard.`,
      'Copy failed',
      'Your browser blocked clipboard access.',
    );
  };

  useEffect(() => {
    const cleanupMeta = applySeoMeta({
      title: 'MTG Search Guides — Learn to Find Any Magic Card | OffMeta',
      description:
        'Master MTG card search with 10 progressive guides — from basic type searches to multi-constraint queries, all in natural language.',
      url: 'https://offmeta.app/guides',
      type: 'website',
      section: 'Guides',
      keywords: [
        'MTG search guides',
        'Magic: The Gathering search',
        'Scryfall alternatives',
        'natural language MTG search',
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
          isPartOf: { '@type': 'WebSite', name: 'OffMeta', url: 'https://offmeta.app/' },
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
  }, []);

  const sorted = [...GUIDES].sort((a, b) => a.level - b.level);
  const activeBounds =
    GUIDE_FILTERS.find((filter) => filter.key === activeFilter) ?? GUIDE_FILTERS[0];
  const grouped = LEVEL_GROUPS.map((group) => ({
    ...group,
    guides: sorted.filter(
      (guide) =>
        guide.level >= group.min &&
        guide.level <= group.max &&
        guide.level >= activeBounds.min &&
        guide.level <= activeBounds.max,
    ),
  })).filter((group) => group.guides.length > 0);

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      <SkipLinks />
      <Header />

      <nav className="container-main pt-4 sm:pt-6 pb-2" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <li>
            <Link to="/" className="hover:text-foreground transition-colors">
              {t('nav.home')}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground font-medium">{t('nav.guides')}</li>
        </ol>
      </nav>

      <main
        id="main-content"
        className="flex-1 container-main py-8 sm:py-10 lg:py-12"
      >
        <div className="max-w-4xl mx-auto space-y-8 sm:space-y-10 min-w-0">
          <header className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2.5 text-primary">
              <BookOpen className="h-6 w-6" />
              <Sparkles className="h-5 w-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-5xl font-semibold text-foreground leading-tight">
              {t('guides.pageTitle')}
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
              {t('guides.pageSubtitle')}
            </p>
            <p className="text-sm text-muted-foreground">{t('guides.count')}</p>
          </header>

          <div className="flex flex-wrap justify-center gap-2">
            {GUIDE_FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeFilter === filter.key
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-foreground hover:border-primary/30 hover:text-primary'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {grouped.map((group) => (
              <a
                key={group.key}
                href={`#${group.key}`}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/30 hover:text-primary transition-colors"
              >
                {t(group.label)}
                <span className="text-muted-foreground">
                  ({group.guides.length})
                </span>
              </a>
            ))}
          </div>

          <div className="space-y-8">
            {grouped.map((group) => {
              const labelKey = group.label;
              const colorClass =
                LEVEL_COLORS[labelKey] || LEVEL_COLORS['guides.levelBeginner'];

              return (
                <section key={group.key} id={group.key} className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <h2 className="text-lg sm:text-xl font-semibold text-foreground">
                        {t(group.label)}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {Number(group.min) === Number(group.max)
                          ? `Level ${group.min}`
                          : `Levels ${group.min}-${group.max}`}{' '}
                        • {group.guides.length} guides
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold uppercase tracking-wide ${colorClass}`}
                    >
                      {t(labelKey)}
                    </Badge>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {group.guides.map((guide) => (
                      <div
                        key={guide.slug}
                        className="group relative rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-200 p-5 sm:p-6 flex flex-col min-w-0 overflow-hidden"
                      >
                        <Link
                          to={`/guides/${guide.slug}`}
                          className="contents"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-semibold uppercase tracking-wide ${colorClass}`}
                            >
                              {t(labelKey)} • {t('guides.level')} {guide.level}
                            </Badge>
                          </div>

                          <h3 className="text-base sm:text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-1.5">
                            {t(`guide.title.${guide.slug}`, guide.title)}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-4 flex-1">
                            {t(`guide.sub.${guide.slug}`, guide.subheading)}
                          </p>
                        </Link>

                        <div className="rounded-lg bg-muted/40 border border-border/50 px-3 py-2 mb-4 min-w-0 overflow-hidden">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                            {t('guides.exampleSearch')}
                          </p>
                          <p className="text-sm font-mono text-foreground/80 truncate">
                            "{guide.searchQuery}"
                          </p>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <Link
                            to={`/guides/${guide.slug}`}
                            className="flex items-center gap-1 text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            {t('guides.readGuide')}{' '}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                          <div className="flex flex-wrap gap-2 sm:self-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => {
                                void copyGuideUrl(guide.slug, guide.title);
                              }}
                            >
                              <Copy className="h-3.5 w-3.5" />
                              Copy query
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => {
                                void shareGuide(guide.slug, guide.title);
                              }}
                            >
                              <Share2 className="h-3.5 w-3.5" />
                              Share guide
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center space-y-3 overflow-hidden">
            <h2 className="text-lg font-semibold text-foreground">
              {t('guides.readyToSearch')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('guides.readyToSearchDesc')}
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
            >
              {t('guides.startSearching')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>

      <Footer />
      <ScrollToTop threshold={400} />
    </div>
  );
}
