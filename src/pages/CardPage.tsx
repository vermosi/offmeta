/**
 * Card detail page — "The Off-Meta Perspective" for a single card.
 * Route: /cards/:slug (e.g. /cards/sol-ring)
 *
 * Shows card data + off-meta alternatives, synergies, and budget picks.
 * Includes Product JSON-LD, BreadcrumbList, and rich SEO meta.
 * @module pages/CardPage
 */

import { useEffect, useMemo } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCardByName } from '@/lib/scryfall/client';
import { slugToCardName, cardNameToSlug } from '@/lib/card-slug';
import {
  applySeoMeta,
  injectJsonLd,
  buildCardJsonLd,
  buildBreadcrumbJsonLd,
} from '@/lib/seo';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Skeleton } from '@/components/ui/skeleton';
import { CardDetailView } from '@/components/card-detail/CardDetailView';
import { PageSearchBar } from '@/components/PageSearchBar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import type { ScryfallCard } from '@/types/card';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCardImage(card: ScryfallCard, size: 'normal' | 'large' | 'art_crop' = 'normal', faceIndex = 0): string | undefined {
  // Single-faced cards or cards where both faces share one image
  if (card.image_uris) return card.image_uris[size];
  // Double-faced cards with per-face images
  return card.card_faces?.[faceIndex]?.image_uris?.[size] ?? card.card_faces?.[0]?.image_uris?.[size];
}

// ── Component ─────────────────────────────────────────────────────────────────

const CardPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const guessedName = slug ? slugToCardName(slug) : '';

  // Fetch card from Scryfall
  const {
    data: card,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['card-page', guessedName],
    queryFn: () => getCardByName(guessedName),
    enabled: !!guessedName,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });

  // Dedicated route-level analytics — distinct from `card_modal_view` (in-app modal).
  const { trackCardPageView } = useAnalytics();
  useEffect(() => {
    if (!slug) return;
    const canonicalSlug = card ? cardNameToSlug(card.name) : undefined;
    const referrerSource =
      typeof document !== 'undefined' && document.referrer
        ? (() => {
            try {
              const ref = new URL(document.referrer);
              return ref.origin === window.location.origin ? 'internal' : 'external';
            } catch {
              return 'direct';
            }
          })()
        : 'direct';
    trackCardPageView({
      slug,
      canonical_slug: canonicalSlug,
      card_id: card?.id,
      card_name: card?.name,
      set_code: card?.set,
      is_alias: canonicalSlug ? canonicalSlug !== slug : undefined,
      referrer_source: referrerSource,
    });
    // Fire once per slug/card resolution.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, card?.id]);

  // SEO meta — canonical URL uses the card's canonical slug (from its real name),
  // so alternate spellings/slugs collapse to a single indexable URL.
  const canonicalSlug = card ? cardNameToSlug(card.name) : slug;
  const pageUrl = `https://offmeta.app/cards/${canonicalSlug}`;
  useEffect(() => {
    if (!card) return;

    const typeShort = card.type_line.split('—')[0].trim().toLowerCase();
    const colorNames = (card.colors ?? []).map(
      (c) => ({ W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green' }[c] ?? c),
    );
    const colorLabel = colorNames.length > 0 ? colorNames.join('/') + ' ' : '';
    const priceSnippet = card.prices?.usd ? ` From $${card.prices.usd}.` : '';
    const legalFormats = Object.entries(card.legalities)
      .filter(([, v]) => v === 'legal')
      .map(([f]) => f);
    const formatSnippet = legalFormats.includes('commander')
      ? ' Commander legal.'
      : legalFormats.length > 0
        ? ` Legal in ${legalFormats[0]}.`
        : '';

    const description = `Cards like ${card.name}: similar ${colorLabel}${typeShort} picks, off-meta alternatives, prices & synergies.${priceSnippet}${formatSnippet}`;

    // Build a title that stays under 60 chars even for long card names.
    const fullTitle = `Cards Like ${card.name} — Similar MTG Picks | OffMeta`;
    const shortTitle = `Cards Like ${card.name} | OffMeta`;
    const minimalTitle = `${card.name} alternatives | OffMeta`;
    const pickedTitle = fullTitle.length <= 60
      ? fullTitle
      : shortTitle.length <= 60
        ? shortTitle
        : minimalTitle.length <= 60
          ? minimalTitle
          : `${card.name.slice(0, 60 - ' | OffMeta'.length - 1)}… | OffMeta`;
    const cleanupSeo = applySeoMeta({
      title: pickedTitle,
      description: description.slice(0, 160),
      url: pageUrl,
      type: 'website',
      image: getCardImage(card, 'art_crop'),
      twitterCard: 'summary_large_image',
      extraMeta: {
        'robots': 'index, follow',
        'og:site_name': 'OffMeta',
      },
    });

    const cleanupJsonLd = injectJsonLd({
      '@graph': [
        buildCardJsonLd(card, pageUrl),
        buildBreadcrumbJsonLd([
          { name: 'OffMeta', url: 'https://offmeta.app/' },
          { name: 'Cards', url: 'https://offmeta.app/cards' },
          { name: card.name, url: pageUrl },
        ]),
      ],
    });

    return () => {
      cleanupSeo();
      cleanupJsonLd();
    };
  }, [card, pageUrl, slug]);

  // Price display
  const priceDisplay = useMemo(() => {
    if (!card) return null;
    const usd = card.prices?.usd;
    const foil = card.prices?.usd_foil;
    if (!usd && !foil) return null;
    return { usd, foil };
  }, [card]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background relative">
        <div className="fixed inset-0 pointer-events-none bg-page-gradient" aria-hidden="true" />
        <Header />
        <main
          className="relative flex-1 py-4 sm:py-10"
          role="status"
          aria-busy="true"
          aria-label="Loading card details"
        >
          <div className="container-main space-y-6 sm:space-y-10 animate-fade-in">
            {/* Search bar placeholder */}
            <Skeleton className="h-11 w-full rounded-full" />

            {/* Breadcrumb placeholder */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16" />
              <span className="text-muted-foreground/40">/</span>
              <Skeleton className="h-4 w-40" />
            </div>

            {/* Card hero: image on top on mobile, side-by-side on md+ */}
            <div className="grid gap-6 sm:gap-8 md:grid-cols-[320px_1fr]">
              <div className="mx-auto w-full max-w-[300px] sm:max-w-[320px] md:mx-0">
                <Skeleton className="aspect-[488/680] w-full rounded-xl" />
              </div>

              <div className="space-y-4">
                {/* Title + mana cost row */}
                <div className="flex items-start justify-between gap-3">
                  <Skeleton className="h-7 sm:h-9 w-2/3" />
                  <Skeleton className="h-7 w-20 rounded-md" />
                </div>

                {/* Type line */}
                <Skeleton className="h-4 w-1/2" />

                {/* Oracle text block */}
                <div className="space-y-2 rounded-lg border border-border/60 bg-card/40 p-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-11/12" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4 w-3/4" />
                </div>

                {/* Stat chips row */}
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-7 w-24 rounded-full" />
                  <Skeleton className="h-7 w-20 rounded-full" />
                  <Skeleton className="h-7 w-28 rounded-full" />
                </div>

                {/* CTAs */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Skeleton className="h-10 w-32 rounded-md" />
                  <Skeleton className="h-10 w-24 rounded-md" />
                </div>
              </div>
            </div>

            {/* Section: similar cards */}
            <div className="space-y-3">
              <Skeleton className="h-5 w-40" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[488/680] w-full rounded-lg" />
                ))}
              </div>
            </div>

            <span className="sr-only">Loading card details…</span>
          </div>
        </main>
        <Footer />
      </div>
    );
  }


  if (error || !card) {
    // Invalid/unknown card slug — mark noindex so crawlers drop it, but keep
    // the response accessible for users who followed a broken link.
    if (typeof document !== 'undefined') {
      document.title = `Card not found | OffMeta`;
      let robots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
      if (!robots) {
        robots = document.createElement('meta');
        robots.setAttribute('name', 'robots');
        document.head.appendChild(robots);
      }
      robots.setAttribute('content', 'noindex, follow');
      const canonical = document.querySelector('link[rel="canonical"]');
      canonical?.remove();
    }
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container-main py-16 text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Card Not Found</h1>
          <p className="text-muted-foreground">
            We couldn't find a card matching "{guessedName}".
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Search for cards
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  // Alias slug → canonical redirect. If the URL slug doesn't match the
  // canonical slug derived from the resolved card name (e.g. missing
  // punctuation, diacritics, older/misspelled variants that resolved via
  // fuzzy lookup), send the client to the canonical /cards/:slug URL so
  // links, analytics, and SEO consolidate on a single path.
  if (card && canonicalSlug && canonicalSlug !== slug) {
    return <Navigate to={`/cards/${canonicalSlug}`} replace />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-background relative">
        <div className="fixed inset-0 pointer-events-none bg-page-gradient" aria-hidden="true" />
        <Header />

        <main className="relative flex-1 py-4 sm:py-10">
          <div className="container-main space-y-6 sm:space-y-10 animate-fade-in">
            {/* Persistent search funnel */}
            <PageSearchBar
              placeholder={`Search cards like ${card.name}…`}
              initialValue=""
            />

            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
              <ol className="flex items-center gap-1.5">
                <li><Link to="/" className="hover:text-foreground transition-colors">OffMeta</Link></li>
                <li aria-hidden="true">/</li>
                <li className="text-foreground font-medium truncate">{card.name}</li>
              </ol>
            </nav>

            {/* Unified card detail view (same UI everywhere in the app) */}
            <CardDetailView card={card} />
          </div>

        </main>

        <Footer />
      </div>
    </ErrorBoundary>
  );
};

export default CardPage;
