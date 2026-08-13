import { useLocation, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { logger } from '@/lib/core/logger';
import { useTranslation } from '@/lib/i18n';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SkipLinks } from '@/components/SkipLinks';
import { useNoIndex } from '@/hooks';
import { applySeoMeta } from '@/lib/seo';
import { Search, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();

  // Ensure crawlers do not index 404s and social preview reflects the state,
  // instead of inheriting the last route's meta.
  useNoIndex(true);

  useEffect(() => {
    const cleanup = applySeoMeta({
      title: 'Page not found — OffMeta MTG',
      description:
        "The page you're looking for doesn't exist. Search Magic: The Gathering cards in plain English on OffMeta.",
      url: `https://offmeta.app${location.pathname}`,
      type: 'website',
      // A 404 URL must not advertise itself as canonical.
      noCanonical: true,
    });

    logger.error(
      '404 Error: User attempted to access non-existent route:',
      location.pathname,
    );
    return cleanup;
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SkipLinks />
      <Header />

      <main id="main-content" className="container-main flex-1 py-20">
        <div className="max-w-2xl">
          <p
            className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground"
            aria-hidden="true"
          >
            404
          </p>
          <h1 className="mt-4 font-display text-3xl font-bold uppercase tracking-tight text-foreground">
            {t('notFound.title')}
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            {t(
              'notFound.description',
              "The page you're looking for doesn't exist or has been moved.",
            )}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="default" className="gap-2">
              <Link to="/">
                <Search className="h-4 w-4" />
                {t('notFound.searchCards', 'Search Cards')}
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/">
                <ArrowLeft className="h-4 w-4" />
                {t('notFound.backHome')}
              </Link>
            </Button>
          </div>

          <div className="mt-12 grid grid-cols-1 divide-y divide-border/60 border-y border-border/60 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <Link
              to="/browse-searches"
              className="group p-6 transition-colors hover:bg-muted/30 focus-ring"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {t('notFound.browseSearches', 'Browse searches')}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-foreground/80">
                {t(
                  'notFound.browseSearchesDescription',
                  'See curated and recent search patterns that can help you get back on track.',
                )}
              </p>
            </Link>
            <Link
              to="/guides"
              className="group p-6 transition-colors hover:bg-muted/30 focus-ring"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {t('notFound.readGuides', 'Read guides')}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-foreground/80">
                {t(
                  'notFound.readGuidesDescription',
                  'Explore practical deckbuilding and search tips for the next step.',
                )}
              </p>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NotFound;
