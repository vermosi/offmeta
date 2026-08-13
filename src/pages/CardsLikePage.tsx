import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Search, Sparkles } from 'lucide-react';
import { applySeoMeta, injectJsonLd, buildBreadcrumbJsonLd } from '@/lib/seo';
import { useSimilarCards } from '@/hooks/useSimilarCards';
import { useAnalytics } from '@/hooks/useAnalytics';
import { SimilarCardsPanel } from '@/components/SimilarCardsPanel';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { getCardByName } from '@/lib/scryfall/client';
import { useTranslation } from '@/lib/i18n';
import { cardNameToSlug, slugToCardName } from '@/lib/card-slug';
import type { ScryfallCard } from '@/types/card';

type Attribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
};

const COMPLETED_COUNT_KEY = 'offmeta_cards_like_completed_count';

function readAttribution(): Attribution {
  try {
    const raw = sessionStorage.getItem('offmeta_utm');
    if (!raw) return {};
    return JSON.parse(raw) as Attribution;
  } catch {
    return {};
  }
}

function isPaidSearch(attribution: Attribution): boolean {
  return Boolean(
    attribution.gclid ||
      ['cpc', 'ppc', 'paidsearch', 'paid_search'].includes(
        (attribution.utm_medium || '').toLowerCase(),
      ),
  );
}

function readCompletedCount(): number {
  try {
    const raw = sessionStorage.getItem(COMPLETED_COUNT_KEY);
    const count = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(count) && count > 0 ? count : 0;
  } catch {
    return 0;
  }
}

function writeCompletedCount(count: number): void {
  try {
    sessionStorage.setItem(COMPLETED_COUNT_KEY, String(count));
  } catch {
    /* best effort */
  }
}

export default function CardsLikePage() {
  const { t } = useTranslation();
  const { cardSlug } = useParams<{ cardSlug?: string }>();
  const navigate = useNavigate();
  const { trackEvent } = useAnalytics();
  const [inputValue, setInputValue] = useState(() =>
    cardSlug ? slugToCardName(cardSlug) : '',
  );
  const [submittedQuery, setSubmittedQuery] = useState(() =>
    cardSlug ? slugToCardName(cardSlug) : '',
  );
  const [fallbackCard, setFallbackCard] = useState<ScryfallCard | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const lastCompletedRef = useRef<string | null>(null);
  const completedCountRef = useRef(readCompletedCount());

  const query = submittedQuery.trim();
  const { similarityData, isLoading, errorMessage } = useSimilarCards(
    query,
    fallbackCard,
    { trackActivation: false },
  );

  const attribution = useMemo(readAttribution, []);

  useEffect(() => {
    const cardName = cardSlug ? slugToCardName(cardSlug) : null;
    const pageUrl = `https://offmeta.app${cardSlug ? `/cards-like/${cardSlug}` : '/cards-like'}`;
    const pageTitle = cardName
      ? `Cards Like ${cardName} | OffMeta`
      : 'Find Cards Like Any MTG Card | OffMeta';
    const pageDescription = cardName
      ? `Alternatives and functionally similar Magic: The Gathering cards to ${cardName}, ranked by how they play.`
      : 'Search any Magic: The Gathering card and discover similar cards, alternatives, and related options with OffMeta.';

    const cleanupMeta = applySeoMeta({
      title: pageTitle,
      description: pageDescription,
      url: pageUrl,
      type: 'website',
    });

    const crumbs = [
      { name: 'OffMeta', url: 'https://offmeta.app/' },
      { name: 'Cards Like', url: 'https://offmeta.app/cards-like' },
    ];
    if (cardName) crumbs.push({ name: cardName, url: pageUrl });

    const cleanupLd = injectJsonLd({
      '@context': 'https://schema.org',
      '@graph': [
        buildBreadcrumbJsonLd(crumbs),
        {
          '@type': 'CollectionPage',
          name: pageTitle,
          description: pageDescription,
          url: pageUrl,
          inLanguage: 'en',
          isPartOf: {
            '@type': 'WebSite',
            name: 'OffMeta',
            url: 'https://offmeta.app/',
          },
        },
      ],
    });

    return () => {
      cleanupMeta();
      cleanupLd();
    };
  }, [cardSlug]);

  useEffect(() => {
    if (!cardSlug) return;
    const name = slugToCardName(cardSlug);
    setInputValue(name);
    setSubmittedQuery(name);
  }, [cardSlug]);

  useEffect(() => {
    if (!similarityData || isLoading || errorMessage) return;
    if (lastCompletedRef.current === query) return;
    const payload = {
      searched_card_name: similarityData.sourceCard.name,
      searched_card_id: similarityData.sourceCard.id,
      searched_card_slug: cardSlug ?? '',
      result_count:
        (similarityData.similarResults?.data?.length ?? 0) +
        (similarityData.budgetResults?.data?.length ?? 0),
      acquisition_source: attribution.utm_source ?? '',
      acquisition_medium: attribution.utm_medium ?? '',
      acquisition_campaign: attribution.utm_campaign ?? '',
      acquisition_term: attribution.utm_term ?? '',
      acquisition_content: attribution.utm_content ?? '',
      gclid: attribution.gclid ?? '',
      paid_search: isPaidSearch(attribution),
    };
    if (payload.result_count <= 0) return;
    lastCompletedRef.current = query;
    const nextCount = completedCountRef.current + 1;
    completedCountRef.current = nextCount;
    writeCompletedCount(nextCount);
    trackEvent(
      nextCount > 1
        ? 'cards_like_second_search'
        : 'cards_like_search_completed',
      payload,
    );
  }, [
    attribution,
    cardSlug,
    errorMessage,
    isLoading,
    query,
    similarityData,
    trackEvent,
  ]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuery = inputValue.trim();
    if (!nextQuery) return;
    setSearchError(null);
    setIsResolving(true);
    try {
      const card = await getCardByName(nextQuery);
      setFallbackCard(card);
      setSubmittedQuery(nextQuery);
      navigate(`/cards-like/${cardNameToSlug(card.name)}`, { replace: true });
    } catch {
      setSearchError(t('search.cardsLike.notFound', 'We could not find that card. Try the exact card name.'));
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto flex max-w-5xl flex-col px-4 py-8 sm:py-12">
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <header className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              {t('search.cardsLike.badge', 'Find Cards Like Any MTG Card')}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {t('search.cardsLike.heading', 'Search a card, see similar cards, and move on.')}
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t('search.cardsLike.subheading', 'Type a Magic card name to find close matches and alternatives. This is the fastest way to see what else plays the same role.')}
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-3 rounded-3xl border border-border/60 bg-card/70 p-4 shadow-sm sm:p-5">
            <label htmlFor="cards-like-input" className="text-sm font-medium text-foreground">
              {t('search.cardsLike.inputLabel', 'Search for a Magic card')}
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="cards-like-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Rhystic Study"
                className="min-h-12 flex-1 rounded-2xl border border-border/70 bg-background px-4 text-base text-foreground outline-none focus:border-primary"
                autoComplete="off"
                spellCheck="false"
              />
              <Button type="submit" className="h-12 rounded-2xl px-5" disabled={isResolving || !inputValue.trim()}>
                <Search className="h-4 w-4" aria-hidden="true" />
                {t('search.cardsLike.submitButton', 'Find similar cards')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('search.cardsLike.hint', 'Try a card name like Sol Ring or Rhystic Study.')}
            </p>
          </form>

          {errorMessage ? (
            <div className="rounded-2xl border border-border/60 bg-card/70 p-5 text-sm text-muted-foreground">
              {errorMessage}
            </div>
          ) : null}

          {searchError ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
              {searchError}
            </div>
          ) : null}

          {query ? (
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {t('search.cardsLike.resultsLabel', 'Results')}
                  </p>
                  <h2 className="text-lg font-semibold text-foreground">
                    {t('search.cardsLike.resultsHeading', 'Cards like {query}', { query })}
                  </h2>
                </div>
                <a
                  href="#cards-like-results"
                  className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs font-medium text-foreground"
                >
                  {t('search.cardsLike.jumpToResults', 'Jump to results')}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
              <div id="cards-like-results">
                <SimilarCardsPanel
                  data={similarityData}
                  isLoading={isLoading || isResolving}
                  onCardClick={() => undefined}
                />
              </div>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
