/**
 * Card detail page — "The Off-Meta Perspective" for a single card.
 * Route: /cards/:slug (e.g. /cards/sol-ring)
 *
 * Shows card data + off-meta alternatives, synergies, and budget picks.
 * Includes Product JSON-LD, BreadcrumbList, and rich SEO meta.
 * @module pages/CardPage
 */

import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCardByName } from '@/lib/scryfall/client';
import { slugToCardName, cardNameToSlug } from '@/lib/card-slug';
import {
  applySeoMeta,
  injectJsonLd,
  buildCardJsonLd,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  buildCardFaqs,
} from '@/lib/seo';
import { useSimilarCards } from '@/hooks';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ManaSymbol } from '@/components/ManaSymbol';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Skeleton } from '@/components/ui/skeleton';
import { FeatureCrossLinks } from '@/components/FeatureCrossLinks';
import { Badge } from '@/components/ui/badge';
import {
  ExternalLink,
  ArrowLeft,
  Search,
  DollarSign,
  Sparkles,
  Shield,
  RotateCw,
} from 'lucide-react';
import type { ScryfallCard } from '@/types/card';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCardImage(card: ScryfallCard, size: 'normal' | 'large' | 'art_crop' = 'normal', faceIndex = 0): string | undefined {
  // Single-faced cards or cards where both faces share one image
  if (card.image_uris) return card.image_uris[size];
  // Double-faced cards with per-face images
  return card.card_faces?.[faceIndex]?.image_uris?.[size] ?? card.card_faces?.[0]?.image_uris?.[size];
}

/** Check if a card is a true double-faced card with separate face images. */
function isDFC(card: ScryfallCard): boolean {
  return !!(card.card_faces && card.card_faces.length > 1 && card.card_faces[0]?.image_uris);
}

function getOracleText(card: ScryfallCard): string {
  return card.oracle_text ?? card.card_faces?.map((f) => f.oracle_text).filter(Boolean).join('\n\n') ?? '';
}

/** Generate contextual search queries based on card properties for internal linking. */
function getRelatedSearches(card: ScryfallCard): string[] {
  const searches: string[] = [];
  const typeLine = card.type_line ?? '';
  const colors = card.colors ?? [];
  const colorName = colors.length === 0 ? 'colorless'
    : colors.length === 1 ? ({ W: 'white', U: 'blue', B: 'black', R: 'red', G: 'green' }[colors[0]] ?? '')
    : '';

  // Type-based searches
  if (typeLine.includes('Creature')) {
    searches.push(`best ${colorName} creatures`.trim());
  }
  if (typeLine.includes('Instant') || typeLine.includes('Sorcery')) {
    searches.push(`${colorName} removal spells`.trim());
  }
  if (typeLine.includes('Artifact')) {
    searches.push('best mana rocks');
  }
  if (typeLine.includes('Enchantment')) {
    searches.push(`${colorName} enchantments`.trim());
  }

  // Keyword-based searches
  const oracle = getOracleText(card).toLowerCase();
  if (oracle.includes('draw')) searches.push('card draw engines');
  if (oracle.includes('destroy') || oracle.includes('exile')) searches.push('board wipes');
  if (oracle.includes('token')) searches.push('token generators');
  if (oracle.includes('graveyard') || oracle.includes('return from')) searches.push('graveyard recursion');
  if (oracle.includes('search your library')) searches.push('tutor effects');
  if (oracle.includes('counter target')) searches.push('counterspells');

  // Price-based
  const price = parseFloat(card.prices?.usd ?? '0');
  if (price > 20) searches.push(`budget alternatives to ${card.name}`);

  // Dedupe and limit
  return [...new Set(searches)].slice(0, 6);
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

  const [faceIndex, setFaceIndex] = useState(0);

  // Reset face when card changes
  useEffect(() => {
    setFaceIndex(0);
  }, [card?.name]);

  // Activate similar cards on load
  const {
    similarityData,
    isLoading: similarLoading,
    activate,
  } = useSimilarCards(card?.name ?? '');

  useEffect(() => {
    if (card) activate();
  }, [card, activate]);

  // SEO meta
  const pageUrl = `https://offmeta.app/cards/${slug}`;
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

    const description = `${card.name} — ${colorLabel}${typeShort}. Find off-meta alternatives, synergies, and budget picks.${priceSnippet}${formatSnippet}`;

    const cleanupSeo = applySeoMeta({
      title: `${card.name} — MTG Off-Meta Alternatives, Price & Synergies | OffMeta`,
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

    // Build FAQ structured data
    const cardFaqs = buildCardFaqs(card);

    const cleanupJsonLd = injectJsonLd({
      '@graph': [
        buildCardJsonLd(card, pageUrl),
        buildBreadcrumbJsonLd([
          { name: 'OffMeta', url: 'https://offmeta.app/' },
          { name: 'Cards', url: 'https://offmeta.app/cards' },
          { name: card.name, url: pageUrl },
        ]),
        ...(cardFaqs.length > 0 ? [buildFaqJsonLd(cardFaqs)] : []),
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
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container-main py-8 space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid md:grid-cols-[320px_1fr] gap-8">
            <Skeleton className="aspect-[488/680] rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !card) {
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

  const isFlippable = isDFC(card);
  const activeFace = isFlippable ? card.card_faces![faceIndex] : null;
  const oracleText = activeFace?.oracle_text ?? getOracleText(card);
  const cardImage = getCardImage(card, 'large', faceIndex);
  const displayName = activeFace?.name ?? card.name;
  const displayTypeLine = activeFace?.type_line ?? card.type_line;
  const displayManaCost = activeFace?.mana_cost ?? card.mana_cost;

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-background relative">
        <div className="fixed inset-0 pointer-events-none bg-page-gradient" aria-hidden="true" />
        <Header />

        <main className="relative flex-1 py-6 sm:py-10">
          <div className="container-main space-y-8">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
              <ol className="flex items-center gap-1.5">
                <li><Link to="/" className="hover:text-foreground transition-colors">OffMeta</Link></li>
                <li aria-hidden="true">/</li>
                <li className="text-foreground font-medium truncate">{card.name}</li>
              </ol>
            </nav>

            {/* Card hero section */}
            <div className="grid md:grid-cols-[320px_1fr] gap-6 lg:gap-10">
              {/* Card image */}
              <div className="flex flex-col items-center gap-3">
                {cardImage ? (
                  <img
                    src={cardImage}
                    alt={`${card.name} card art`}
                    className="rounded-xl shadow-elegant w-full max-w-[320px]"
                    loading="eager"
                    width={672}
                    height={936}
                  />
                ) : (
                  <div className="aspect-[488/680] bg-muted rounded-xl w-full max-w-[320px]" />
                )}

                {/* Purchase links */}
                {card.purchase_uris && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {card.purchase_uris.tcgplayer && (
                      <a
                        href={card.purchase_uris.tcgplayer}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                      >
                        TCGplayer <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {card.purchase_uris.cardmarket && (
                      <a
                        href={card.purchase_uris.cardmarket}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                      >
                        Cardmarket <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Card info */}
              <div className="space-y-5">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3 flex-wrap">
                    {card.name}
                    {card.mana_cost && (
                      <span className="inline-flex items-center gap-0.5">
                        {card.mana_cost.match(/\{[^}]+\}/g)?.map((s, i) => (
                          <ManaSymbol key={i} symbol={s} size="sm" />
                        ))}
                      </span>
                    )}
                  </h1>
                  <p className="text-muted-foreground mt-1">{card.type_line}</p>
                </div>

                {/* Oracle text */}
                {oracleText && (
                  <div className="bg-card/60 border border-border/40 rounded-lg p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {oracleText}
                  </div>
                )}

                {/* Stats row */}
                <div className="flex flex-wrap gap-3">
                  {card.power != null && card.toughness != null && (
                    <Badge variant="outline">{card.power}/{card.toughness}</Badge>
                  )}
                  <Badge variant="outline" className="capitalize">{card.rarity}</Badge>
                  <Badge variant="outline">{card.set_name}</Badge>
                  {priceDisplay?.usd && (
                    <Badge variant="secondary" className="gap-1">
                      <DollarSign className="h-3 w-3" />
                      ${priceDisplay.usd}
                    </Badge>
                  )}
                </div>

                {/* Format legalities */}
                <div>
                  <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    Legalities
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(card.legalities)
                      .filter(([, v]) => v === 'legal')
                      .slice(0, 10)
                      .map(([format]) => (
                        <Badge
                          key={format}
                          variant="outline"
                          className="text-[10px] capitalize bg-primary/5 border-primary/20 text-primary"
                        >
                          {format}
                        </Badge>
                      ))}
                  </div>
                </div>

                {/* Links */}
                <div className="flex flex-wrap gap-3 pt-2">
                  <a
                    href={card.scryfall_uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    View on Scryfall <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <Link
                    to={`/?q=${encodeURIComponent(card.name)}`}
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <Search className="h-3.5 w-3.5" />
                    Find more like this
                  </Link>
                </div>
              </div>
            </div>

            {/* Off-Meta Alternatives section */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Off-Meta Alternatives
              </h2>
              <p className="text-sm text-muted-foreground">
                Looking beyond the staples? Here are cards that fill a similar role but might fly under the radar.
              </p>

              {similarLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-[488/680] rounded-lg" />
                  ))}
                </div>
              ) : similarityData?.similarResults?.data?.length ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {similarityData.similarResults.data.slice(0, 8).map((alt) => (
                    <Link
                      key={alt.id}
                      to={`/cards/${cardNameToSlug(alt.name)}`}
                      className="group"
                    >
                      <div className="rounded-lg overflow-hidden border border-border/30 hover:border-primary/40 transition-all hover:shadow-lg">
                        {alt.image_uris?.normal ? (
                          <img
                            src={alt.image_uris.normal}
                            alt={alt.name}
                            className="w-full"
                            loading="lazy"
                          />
                        ) : (
                          <div className="aspect-[488/680] bg-muted flex items-center justify-center text-sm text-muted-foreground p-4 text-center">
                            {alt.name}
                          </div>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                        {alt.name}
                      </p>
                      {alt.prices?.usd && (
                        <p className="text-xs text-muted-foreground">${alt.prices.usd}</p>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No alternatives found yet. Try searching for this card to discover similar options.
                </p>
              )}
            </section>

            {/* Budget Alternatives */}
            {similarityData?.budgetResults?.data?.length ? (
              <section className="space-y-4">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Budget-Friendly Picks
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {similarityData.budgetResults.data.slice(0, 8).map((alt) => (
                    <Link
                      key={alt.id}
                      to={`/cards/${cardNameToSlug(alt.name)}`}
                      className="group"
                    >
                      <div className="rounded-lg overflow-hidden border border-border/30 hover:border-primary/40 transition-all hover:shadow-lg">
                        {alt.image_uris?.normal ? (
                          <img
                            src={alt.image_uris.normal}
                            alt={alt.name}
                            className="w-full"
                            loading="lazy"
                          />
                        ) : (
                          <div className="aspect-[488/680] bg-muted flex items-center justify-center text-sm text-muted-foreground p-4 text-center">
                            {alt.name}
                          </div>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                        {alt.name}
                      </p>
                      {alt.prices?.usd && (
                        <p className="text-xs text-muted-foreground">${alt.prices.usd}</p>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Synergy Cards */}
            {similarityData?.synergyCards?.length ? (
              <section className="space-y-4">
                <h2 className="text-xl font-bold text-foreground">
                  Pairs Well With
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {similarityData.synergyCards.map((syn) => (
                    <div
                      key={syn.name}
                      className="bg-card/60 border border-border/40 rounded-lg p-4 space-y-1"
                    >
                      <Link
                        to={`/cards/${cardNameToSlug(syn.name)}`}
                        className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                      >
                        {syn.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{syn.reason}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Related Searches — SEO internal links */}
            {card && (
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Search className="h-4 w-4 text-primary" />
                  Related Searches
                </h2>
                <div className="flex flex-wrap gap-2">
                  {getRelatedSearches(card).map((q) => (
                    <Link
                      key={q}
                      to={`/?q=${encodeURIComponent(q)}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full
                        border border-border/40 bg-card/50 hover:bg-primary/10 hover:border-primary/30
                        text-sm text-muted-foreground hover:text-foreground transition-all"
                    >
                      {q}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Cross-links to other tools */}
            <FeatureCrossLinks cardName={card.name} />
          </div>
        </main>

        <Footer />
      </div>
    </ErrorBoundary>
  );
};

export default CardPage;
