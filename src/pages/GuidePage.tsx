/**
 * SEO-optimized guide page component.
 */

import { useEffect } from 'react';
import { applySeoMeta } from '@/lib/seo';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getGuideBySlug, GUIDES } from '@/data/guides';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { PageSearchBar } from '@/components/PageSearchBar';
import { ScrollToTop } from '@/components/ScrollToTop';
import {
  Search,
  ArrowRight,
  ArrowLeft,
  Lightbulb,
  HelpCircle,
  BookOpen,
  Sparkles,
  List,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { SkipLinks } from '@/components/SkipLinks';
import { useToast } from '@/hooks';
import { Copy, Share2 } from 'lucide-react';

const GUIDE_PUBLISHED_AT = '2025-01-15T00:00:00Z';
const GUIDE_MODIFIED_AT = '2026-07-07T00:00:00Z';

export default function GuidePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const guide = slug ? getGuideBySlug(slug) : undefined;
  const { t } = useTranslation();
  const { toast } = useToast();

  useEffect(() => {
    if (!guide) return;
    const keywords = [
      guide.title,
      guide.searchQuery,
      'MTG',
      'Magic: The Gathering',
      'Scryfall',
      'card search',
      'OffMeta guide',
      ...guide.relatedGuides,
    ];
    return applySeoMeta({
      title: guide.metaTitle,
      description: guide.metaDescription,
      url: `https://offmeta.app/guides/${guide.slug}`,
      type: 'article',
      keywords,
      section: 'Guides',
      publishedTime: GUIDE_PUBLISHED_AT,
      modifiedTime: GUIDE_MODIFIED_AT,
    });
  }, [guide]);

  if (!guide) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main
          id="main-content"
          className="flex-1 container-main py-12 sm:py-16"
        >
          <div className="max-w-lg mx-auto rounded-2xl border border-border bg-card p-6 sm:p-8 text-center space-y-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <BookOpen className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">
              {t('guide.notFound')}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              We could not find that guide, but you can still keep learning or
              jump straight back into search.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link
                to="/guides"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:border-primary/30 hover:text-primary transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                {t('nav.guides')}
              </Link>
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
              >
                <Search className="h-4 w-4" />
                {t('nav.backToSearch')}
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const relatedGuides = guide.relatedGuides
    .map((s) => GUIDES.find((g) => g.slug === s))
    .filter(Boolean);
  const sortedGuides = [...GUIDES].sort((a, b) => a.level - b.level);
  const currentGuideIndex = sortedGuides.findIndex(
    (item) => item.slug === guide.slug,
  );
  const previousGuide =
    currentGuideIndex > 0 ? sortedGuides[currentGuideIndex - 1] : undefined;
  const nextGuide =
    currentGuideIndex >= 0 && currentGuideIndex < sortedGuides.length - 1
      ? sortedGuides[currentGuideIndex + 1]
      : undefined;

  const handleSearchClick = () => {
    navigate(`/?q=${encodeURIComponent(guide.searchQuery)}`);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      toast({
        title: 'Link copied',
        description: 'Guide link copied to your clipboard.',
      });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Your browser blocked clipboard access.',
      });
    }
  };

  const handleShare = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: guide.title,
          text: guide.metaDescription,
          url: pageUrl,
        });
        return;
      } catch {
        // Fall through to copy-to-clipboard.
      }
    }

    await handleCopyLink();
  };

  const pageUrl = `https://offmeta.app/guides/${guide.slug}`;

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.metaTitle,
    description: guide.metaDescription,
    url: pageUrl,
    mainEntityOfPage: pageUrl,
    author: { '@type': 'Organization', name: 'OffMeta' },
    publisher: { '@type': 'Organization', name: 'OffMeta' },
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: guide.faq.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://offmeta.app/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Guides',
        item: 'https://offmeta.app/guides',
      },
      { '@type': 'ListItem', position: 3, name: guide.title, item: pageUrl },
    ],
  };

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

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
          <li>
            <Link
              to="/guides"
              className="hover:text-foreground transition-colors"
            >
              {t('nav.guides')}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground font-medium truncate">
            {t(`guide.title.${guide.slug}`, guide.heading)}
          </li>
        </ol>
      </nav>

      <main
        id="main-content"
        className="flex-1 container-main py-8 sm:py-10 lg:py-12"
      >
        <div className="max-w-2xl mx-auto mb-6">
          <PageSearchBar placeholder={`Search: ${guide.searchQuery}`} />
        </div>
        <article className="max-w-2xl mx-auto space-y-8 sm:space-y-10 min-w-0">
          <header className="space-y-4 min-w-0">
            <h1 className="text-2xl sm:text-3xl lg:text-5xl font-semibold text-foreground leading-tight break-words">
              {t(`guide.title.${guide.slug}`, guide.heading)}
            </h1>
            <p className="text-lg text-muted-foreground break-words">
              {t(`guide.sub.${guide.slug}`, guide.subheading)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleCopyLink()}
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy link
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleShare()}
                className="gap-2"
              >
                <Share2 className="h-4 w-4" />
                Share guide
              </Button>
            </div>
          </header>

          <section
            aria-label="On this page"
            className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4"
          >
            <div className="flex items-center gap-2">
              <List className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                On this page
              </h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <a
                href="#search"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:border-primary/30 hover:text-primary transition-colors"
              >
                Search this guide
              </a>
              <a
                href="#tips"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:border-primary/30 hover:text-primary transition-colors"
              >
                Tips & strategy
              </a>
              <a
                href="#faq"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:border-primary/30 hover:text-primary transition-colors"
              >
                FAQ
              </a>
              <a
                href="#related"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:border-primary/30 hover:text-primary transition-colors"
              >
                Related guides
              </a>
            </div>
          </section>

          <div
            id="search"
            className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-3 overflow-hidden"
          >
            <p className="text-sm text-muted-foreground">
              {t('guide.searchInstantly')}
            </p>
            <Button
              onClick={handleSearchClick}
              className="w-full sm:w-auto gap-2 max-w-full !whitespace-normal text-left"
              size="lg"
            >
              <Search className="h-4 w-4 flex-shrink-0" />
              <span className="line-clamp-1">
                {t('guide.search')} "{guide.searchQuery}"
              </span>
              <ArrowRight className="h-4 w-4 flex-shrink-0" />
            </Button>
          </div>

          <section className="min-w-0">
            <p className="text-base leading-relaxed text-foreground/90 break-words">
              {t(`guide.intro.${guide.slug}`, guide.intro)}
            </p>
          </section>

          {'howOffmetaHelps' in guide && guide.howOffmetaHelps && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">
                  {t('guide.howOffmetaHelps')}
                </h2>
              </div>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 overflow-hidden">
                <div className="flex flex-wrap items-center gap-2 mb-2 text-xs text-muted-foreground min-w-0">
                  <span>{t('guide.youType')}</span>
                  <code className="px-2 py-0.5 rounded bg-muted text-foreground font-mono text-xs break-all max-w-full">
                    {guide.searchQuery}
                  </code>
                </div>
                {'translatedQuery' in guide && (
                  <div className="flex flex-wrap items-center gap-2 mb-3 text-xs text-muted-foreground">
                    <span>{t('guide.offmetaGenerates')}</span>
                    <code className="px-2 py-0.5 rounded bg-muted text-foreground font-mono text-xs break-all">
                      {(guide as { translatedQuery: string }).translatedQuery}
                    </code>
                  </div>
                )}
                <p className="text-sm text-foreground/85 leading-relaxed break-words">
                  {t(`guide.howHelps.${guide.slug}`, guide.howOffmetaHelps)}
                </p>
              </div>
            </section>
          )}

          <section id="tips" className="space-y-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">
                {t('guide.tipsStrategy')}
              </h2>
            </div>
            <ul className="space-y-3">
              {guide.tips.map((tip, i) => (
                <li
                  key={i}
                  className="flex gap-3 text-sm text-foreground/85 leading-relaxed"
                >
                  <span className="flex-shrink-0 mt-1 h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                    {i + 1}
                  </span>
                  {t(`guide.tip${i + 1}.${guide.slug}`, tip)}
                </li>
              ))}
            </ul>
          </section>

          <section id="faq" className="space-y-4">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">
                {t('guide.faqHeading')}
              </h2>
            </div>
            <div className="space-y-4">
              {guide.faq.map((f, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-card p-4 space-y-2"
                >
                  <h3 className="font-medium text-foreground">
                    {t(`guide.faq${i + 1}q.${guide.slug}`, f.question)}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t(`guide.faq${i + 1}a.${guide.slug}`, f.answer)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {relatedGuides.length > 0 && (
            <section id="related" className="space-y-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">
                  {t('guide.relatedGuides')}
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {relatedGuides.map(
                  (rg) =>
                    rg && (
                      <Link
                        key={rg.slug}
                        to={`/guides/${rg.slug}`}
                        className="group rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors"
                      >
                        <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {t(`guide.title.${rg.slug}`, rg.title)}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t(`guide.sub.${rg.slug}`, rg.subheading)}
                        </p>
                      </Link>
                    ),
                )}
              </div>
            </section>
          )}

          <section className="grid gap-3 sm:grid-cols-2">
            {previousGuide ? (
              <Link
                to={`/guides/${previousGuide.slug}`}
                className="group rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Previous guide
                </div>
                <h2 className="mt-2 font-medium text-foreground group-hover:text-primary transition-colors">
                  {t(`guide.title.${previousGuide.slug}`, previousGuide.title)}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t(
                    `guide.sub.${previousGuide.slug}`,
                    previousGuide.subheading,
                  )}
                </p>
              </Link>
            ) : (
              <div className="rounded-xl border border-border bg-card p-4 opacity-80">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Starting point
                </div>
                <h2 className="mt-2 font-medium text-foreground">
                  This is the first guide
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Begin here, then move through the rest in order.
                </p>
              </div>
            )}

            {nextGuide ? (
              <Link
                to={`/guides/${nextGuide.slug}`}
                className="group rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <span>Next guide</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
                <h2 className="mt-2 font-medium text-foreground group-hover:text-primary transition-colors">
                  {t(`guide.title.${nextGuide.slug}`, nextGuide.title)}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t(`guide.sub.${nextGuide.slug}`, nextGuide.subheading)}
                </p>
              </Link>
            ) : (
              <div className="rounded-xl border border-border bg-card p-4 opacity-80">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Finished the path
                </div>
                <h2 className="mt-2 font-medium text-foreground">
                  You&apos;ve reached the final guide
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Return to search and try combining everything you learned.
                </p>
              </div>
            )}
          </section>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              {t('guide.readyToFind')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('guide.readyToFindDesc')}
            </p>
            <Button onClick={() => navigate('/')} size="lg" className="gap-2">
              <Search className="h-4 w-4" />
              {t('guides.startSearching')}
            </Button>
          </div>
        </article>
      </main>

      <Footer />
      <ScrollToTop threshold={400} />
    </div>
  );
}
