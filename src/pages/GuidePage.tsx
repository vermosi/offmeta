/**
 * SEO-optimized guide page component.
 */

import { useEffect } from 'react';
import { applySeoMeta, buildBreadcrumbJsonLd, buildGuideArticleJsonLd } from '@/lib/seo';
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
import { buildGuideUrl, copyTextToClipboard } from '@/lib/guide-actions';
import { useNoIndex } from '@/hooks/useNoIndex';
import { queryToSlug } from '@/lib/search-slug';
import { trackFunnelStep } from '@/lib/analytics/funnels';

const GUIDE_PUBLISHED_AT = '2025-01-15T00:00:00Z';
const GUIDE_MODIFIED_AT = '2026-07-07T00:00:00Z';

export default function GuidePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const guide = slug ? getGuideBySlug(slug) : undefined;
  const { t } = useTranslation();
  const { toast } = useToast();

  useNoIndex(!guide);

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

  // Funnel step: guide opened.
  useEffect(() => {
    if (!guide) return;
    trackFunnelStep('guide_open', {
      guide_slug: guide.slug,
      guide_title: guide.title,
      guide_level: guide.level,
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
    navigate(`/search/${queryToSlug(guide.searchQuery)}`);
  };

  const handleCopyLink = async () => {
    await copyTextToClipboard(
      pageUrl,
      toast,
      'Link copied',
      'Guide link copied to your clipboard.',
      'Copy failed',
      'Your browser blocked clipboard access.',
    );
  };

  const handleCopySectionLink = async (sectionId: string, sectionLabel: string) => {
    await copyTextToClipboard(
      `${pageUrl}#${sectionId}`,
      toast,
      'Section link copied',
      `Copied ${sectionLabel} to your clipboard.`,
      'Copy failed',
      'Your browser blocked clipboard access.',
    );
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

  const pageUrl = buildGuideUrl(guide.slug);
  const articleJsonLd = buildGuideArticleJsonLd({
    title: guide.metaTitle,
    description: guide.metaDescription,
    url: pageUrl,
    publishedTime: GUIDE_PUBLISHED_AT,
    modifiedTime: GUIDE_MODIFIED_AT,
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Home', url: 'https://offmeta.app/' },
    { name: 'Guides', url: 'https://offmeta.app/guides' },
    { name: guide.title, url: pageUrl },
  ]);

  const pad = (value: number) => String(value).padStart(2, '0');
  const sectionIndex =
    guide.level <= 3 ? 1 : guide.level <= 6 ? 2 : guide.level <= 8 ? 3 : 4;
  const sectionStart = [1, 1, 4, 7, 9][sectionIndex];
  const guideNumber = `${pad(sectionIndex)}.${pad(guide.level - sectionStart + 1)}`;
  const levelLabel =
    sectionIndex === 1
      ? 'Beginner'
      : sectionIndex === 2
        ? 'Intermediate'
        : sectionIndex === 3
          ? 'Advanced'
          : 'Expert';

  const tocSections: Array<[string, string]> = [
    ['search', 'Try it'],
    ['tips', 'Go further'],
    ['faq', 'FAQ'],
    ['related', 'Related guides'],
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <SkipLinks />
      <Header />

      <nav className="container-main pt-8" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          <li>
            <Link to="/" className="transition-colors hover:text-foreground">
              OffMeta
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link to="/guides" className="transition-colors hover:text-foreground">
              Field Guide
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground">{guideNumber}</li>
        </ol>
      </nav>

      <main id="main-content" className="container-main flex-1 pb-16 pt-8">
        <article className="mx-auto min-w-0 max-w-2xl">
          <header className="border-b border-border/60 pb-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              {levelLabel} / Level {pad(guide.level)}
            </p>
            <h1 className="mt-4 break-words font-display text-[clamp(2rem,5vw,3.25rem)] font-extrabold uppercase leading-[0.9] tracking-tight text-foreground">
              {t(`guide.title.${guide.slug}`, guide.heading)}
            </h1>
            <p className="mt-4 break-words text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t(`guide.sub.${guide.slug}`, guide.subheading)}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
              <button
                type="button"
                onClick={() => void handleCopyLink()}
                className="min-h-[36px] font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground transition-colors hover:text-foreground"
              >
                Copy link
              </button>
              <button
                type="button"
                onClick={() => void handleShare()}
                className="min-h-[36px] font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground transition-colors hover:text-foreground"
              >
                Share guide
              </button>
            </div>
          </header>

          <nav aria-label="In this guide" className="border-b border-border/50 py-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              In this guide
            </p>
            <ol className="mt-3 space-y-1.5">
              {tocSections.map(([sectionId, sectionLabel], index) => (
                <li key={sectionId} className="flex items-baseline gap-3">
                  <span className="font-mono text-[11px] tracking-[0.24em] text-muted-foreground">
                    {pad(index + 1)} /
                  </span>
                  <a
                    href={`#${sectionId}`}
                    className="text-sm text-foreground underline-offset-[6px] transition-colors hover:underline"
                  >
                    {sectionLabel}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <section className="min-w-0 py-8">
            <p className="break-words text-base leading-relaxed text-foreground/90">
              {t(`guide.intro.${guide.slug}`, guide.intro)}
            </p>
          </section>

          <section id="search" className="border-t border-border/50 py-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Example 01
            </p>
            <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-2">
              <p className="min-w-0 break-words font-mono text-lg text-foreground sm:text-xl">
                "{guide.searchQuery}"
              </p>
              <button
                type="button"
                onClick={handleSearchClick}
                className="min-h-[36px] font-mono text-[11px] uppercase tracking-[0.26em] text-foreground underline decoration-border underline-offset-[6px] transition-colors hover:decoration-foreground"
              >
                Run →
              </button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {t('guide.searchInstantly')}
            </p>

            {'howOffmetaHelps' in guide && guide.howOffmetaHelps && (
              <div className="mt-8 space-y-3 border-l-2 border-accent/50 pl-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  Interpreted as
                </p>
                {'translatedQuery' in guide && (
                  <code className="block break-all font-mono text-sm text-foreground">
                    {(guide as { translatedQuery: string }).translatedQuery}
                  </code>
                )}
                <p className="break-words text-sm leading-relaxed text-foreground/85">
                  {t(`guide.howHelps.${guide.slug}`, guide.howOffmetaHelps)}
                </p>
              </div>
            )}

            <div className="mt-8">
              <PageSearchBar placeholder={`Search: ${guide.searchQuery}`} />
            </div>
          </section>

          <section id="tips" className="border-t border-border/50 py-8">
            <h2 className="font-display text-lg font-extrabold uppercase tracking-tight text-foreground">
              {t('guide.tipsStrategy')}
            </h2>
            <ul className="mt-4">
              {guide.tips.map((tip, i) => (
                <li
                  key={i}
                  className="flex gap-4 border-b border-border/40 py-3 first:border-t"
                >
                  <span className="font-mono text-[11px] tracking-[0.24em] text-muted-foreground">
                    {pad(i + 1)}
                  </span>
                  <span className="text-sm leading-relaxed text-foreground/85">
                    {t(`guide.tip${i + 1}.${guide.slug}`, tip)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section id="faq" className="border-t border-border/50 py-8">
            <h2 className="font-display text-lg font-extrabold uppercase tracking-tight text-foreground">
              {t('guide.faqHeading')}
            </h2>
            <dl className="mt-4">
              {guide.faq.map((f, i) => (
                <div key={i} className="border-b border-border/40 py-4 first:border-t">
                  <dt className="font-medium text-foreground">
                    {t(`guide.faq${i + 1}q.${guide.slug}`, f.question)}
                  </dt>
                  <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {t(`guide.faq${i + 1}a.${guide.slug}`, f.answer)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {relatedGuides.length > 0 && (
            <section id="related" className="border-t border-border/50 py-8">
              <h2 className="font-display text-lg font-extrabold uppercase tracking-tight text-foreground">
                {t('guide.relatedGuides')}
              </h2>
              <ul className="mt-4">
                {relatedGuides.map(
                  (rg) =>
                    rg && (
                      <li key={rg.slug}>
                        <Link
                          to={`/guides/${rg.slug}`}
                          className="group flex items-baseline justify-between gap-6 border-b border-border/40 py-4 first:border-t"
                        >
                          <span className="min-w-0">
                            <span className="block font-display text-sm font-bold uppercase tracking-tight text-foreground">
                              {t(`guide.title.${rg.slug}`, rg.title)}
                            </span>
                            <span className="mt-1 block text-sm text-muted-foreground">
                              {t(`guide.sub.${rg.slug}`, rg.subheading)}
                            </span>
                          </span>
                          <span
                            aria-hidden="true"
                            className="font-mono text-xs text-muted-foreground transition-transform group-hover:translate-x-1"
                          >
                            →
                          </span>
                        </Link>
                      </li>
                    ),
                )}
              </ul>
            </section>
          )}

          <section className="border-t border-border/50 py-8">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  Previous
                </p>
                {previousGuide ? (
                  <Link
                    to={`/guides/${previousGuide.slug}`}
                    className="mt-2 block font-display text-sm font-bold uppercase tracking-tight text-foreground underline-offset-[6px] hover:underline"
                  >
                    ← {t(`guide.title.${previousGuide.slug}`, previousGuide.title)}
                  </Link>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    This is the first guide.
                  </p>
                )}
              </div>
              <div className="sm:text-right">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  Next field guide
                </p>
                {nextGuide ? (
                  <Link
                    to={`/guides/${nextGuide.slug}`}
                    className="mt-2 block font-display text-sm font-bold uppercase tracking-tight text-foreground underline-offset-[6px] hover:underline"
                  >
                    {t(`guide.title.${nextGuide.slug}`, nextGuide.title)} →
                  </Link>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    You&apos;ve reached the final guide.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="border-t border-border/50 py-8">
            <h2 className="font-display text-xl font-extrabold uppercase tracking-tight text-foreground">
              {t('guide.readyToFind')}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('guide.readyToFindDesc')}
            </p>
            <Link
              to="/"
              className="mt-4 inline-block font-mono text-[11px] uppercase tracking-[0.26em] text-foreground underline decoration-border underline-offset-[6px] transition-colors hover:decoration-foreground"
            >
              {t('guides.startSearching')} →
            </Link>
          </section>
        </article>
      </main>

      <Footer />
      <ScrollToTop threshold={400} />
    </div>
  );
}

