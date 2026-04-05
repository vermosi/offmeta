/**
 * Deck Recommendations page.
 * Import from Moxfield URL → get AI-powered card recommendations.
 */

import { useState, useEffect } from 'react';
import type { ScryfallCard } from '@/types/card';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { parseDecklist, type ParsedDecklist } from '@/lib/decklist-parser';
import { supabase } from '@/integrations/supabase/client';
import {
  Loader2,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Link2,
  AlertTriangle,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { ManaSymbol, OracleText } from '@/components/ManaSymbol';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { SkipLinks } from '@/components/SkipLinks';

const WUBRG = ['W', 'U', 'B', 'R', 'G'] as const;
const COLOR_NAMES: Record<string, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
};

interface RecommendedCard {
  name: string;
  reason: string;
  scryfall: ScryfallCard | null;
}

interface Category {
  name: string;
  cards: RecommendedCard[];
}

interface RecResult {
  commander: string | null;
  deckSize: number;
  categories: Category[];
}

export default function DeckRecommendations() {
  const { t } = useTranslation();

  useEffect(() => {
    const prev = document.title;
    document.title = 'Deck Recommendations — OffMeta MTG';
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.id = 'deck-recs-jsonld';
    s.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'OffMeta',
          item: 'https://offmeta.app/',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Deck Recommendations',
          item: 'https://offmeta.app/deck-recs',
        },
      ],
    });
    document.head.appendChild(s);
    return () => {
      document.title = prev;
      document.getElementById('deck-recs-jsonld')?.remove();
    };
  }, []);
  const [rawText, setRawText] = useState('');
  const [copiedAll, setCopiedAll] = useState(false);
  const [moxfieldUrl, setMoxfieldUrl] = useState('');
  const [moxfieldDeckName, setMoxfieldDeckName] = useState<string | null>(null);
  const [fetchingDeck, setFetchingDeck] = useState(false);
  const [parsed, setParsed] = useState<ParsedDecklist | null>(null);
  const [colorIdentity, setColorIdentity] = useState<string[]>([]);
  const [result, setResult] = useState<RecResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCard, setCopiedCard] = useState<string | null>(null);

  const handleFetchMoxfield = async () => {
    if (!moxfieldUrl.trim()) return;
    setFetchingDeck(true);
    setMoxfieldDeckName(null);
    try {
      const { data, error } = await supabase.functions.invoke(
        'fetch-moxfield-deck',
        {
          body: { url: moxfieldUrl.trim() },
        },
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setRawText(data.decklist);
      setMoxfieldDeckName(data.deckName);
      setColorIdentity(data.colorIdentity ?? []);
      const p = parseDecklist(data.decklist);
      setParsed(p);
      setResult(null);
      setError(null);
      toast.success(`Imported "${data.deckName}" (${data.cardCount} cards)`);
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : 'Failed to fetch deck from Moxfield';
      toast.error(msg);
    } finally {
      setFetchingDeck(false);
    }
  };

  const handleGetRecs = async () => {
    if (!parsed || parsed.cards.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke(
        'deck-recommendations',
        {
          body: {
            decklist: rawText,
            commander: parsed.commander,
            colorIdentity,
          },
        },
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data as RecResult);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('deckRecs.errorFetch');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const copyName = (name: string) => {
    navigator.clipboard.writeText(name);
    setCopiedCard(name);
    setTimeout(() => setCopiedCard(null), 1500);
  };

  const copyAllRecs = () => {
    if (!result) return;
    const lines = result.categories.flatMap((cat) => [
      `// ${cat.name}`,
      ...cat.cards.map((c) => `1 ${c.name}`),
    ]);
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedAll(true);
    toast.success(t('deckRecs.allCopied'));
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SkipLinks />
      <Header />
      <main id="main-content" className="container-main flex-1 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">{t('deckRecs.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t('deckRecs.subtitle')}
          </p>
        </div>

        {/* Input */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="space-y-3">
              <label className="text-sm font-medium">
                {t('deckRecs.moxfieldLabel')}
              </label>
              <Input
                value={moxfieldUrl}
                onChange={(e) => setMoxfieldUrl(e.target.value)}
                placeholder="https://www.moxfield.com/decks/xqpbIjgy5UqsUBxorCsT2w"
                className="font-mono text-xs"
              />
              <Button
                onClick={handleFetchMoxfield}
                disabled={fetchingDeck || !moxfieldUrl.trim()}
                variant="secondary"
                className="w-full gap-2"
              >
                {fetchingDeck ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                {fetchingDeck
                  ? t('deckRecs.importing')
                  : t('deckRecs.importButton')}
              </Button>
              {moxfieldDeckName && (
                <p className="text-xs text-muted-foreground">
                  ✓ {t('deckRecs.imported')}:{' '}
                  <span className="font-medium text-foreground">
                    {moxfieldDeckName}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Parsed summary */}
          <div className="rounded-xl border border-border p-4 space-y-3">
            <h2 className="text-sm font-semibold">
              {t('deckRecs.parsedSummary')}
            </h2>
            {parsed ? (
              <>
                <div className="text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">
                      {t('deckRecs.commander')}:
                    </span>{' '}
                    {parsed.commander || t('deckRecs.notDetected')}
                  </p>
                  {colorIdentity.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">
                        {t('deckRecs.colors')}:
                      </span>
                      <span className="inline-flex items-center gap-1">
                        {WUBRG.map((c) => (
                          <span
                            key={c}
                            className={`transition-opacity ${colorIdentity.includes(c) ? 'opacity-100' : 'opacity-20'}`}
                            title={COLOR_NAMES[c]}
                          >
                            <ManaSymbol symbol={c} size="sm" />
                          </span>
                        ))}
                      </span>
                    </div>
                  )}
                  <p>
                    <span className="text-muted-foreground">
                      {t('deckRecs.totalCards')}:
                    </span>{' '}
                    {parsed.totalCards}
                  </p>
                  <p>
                    <span className="text-muted-foreground">
                      {t('deckRecs.uniqueCards')}:
                    </span>{' '}
                    {parsed.cards.length}
                  </p>
                </div>
                <div className="max-h-[180px] overflow-y-auto text-xs font-mono text-muted-foreground space-y-0.5">
                  {parsed.cards.map((c, i) => (
                    <div key={i}>
                      {c.quantity}x {c.name}
                    </div>
                  ))}
                </div>
                <Button
                  onClick={handleGetRecs}
                  disabled={loading || parsed.cards.length === 0}
                  className="w-full gap-2"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {loading ? t('deckRecs.analyzing') : t('deckRecs.getButton')}
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('deckRecs.emptyUrl')}
              </p>
            )}
          </div>
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-6">
            <Skeleton className="h-8 w-64 rounded-lg" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border overflow-hidden"
                >
                  <Skeleton className="w-full aspect-[488/680]" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex items-center gap-2 text-sm text-destructive py-3">
            <AlertTriangle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {t('deckRecs.recommendationsFor')}{' '}
                {result.commander || t('deckRecs.yourDeck')}
              </h2>
              <Button
                variant="secondary"
                size="sm"
                className="gap-1.5"
                onClick={copyAllRecs}
              >
                {copiedAll ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copiedAll ? t('deckRecs.copied') : t('deckRecs.copyAll')}
              </Button>
            </div>
            {result.categories.map((cat) => {
              const isSideboard = cat.name === 'Sideboard';
              return (
                <section
                  key={cat.name}
                  className={`space-y-3 ${isSideboard ? 'border-t border-border pt-6' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    {isSideboard && <Shield className="h-5 w-5 text-accent" />}
                    <h3 className="text-lg font-semibold text-primary">
                      {cat.name}
                    </h3>
                    {isSideboard && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium">
                        Meta Answers
                      </span>
                    )}
                  </div>
                  {isSideboard && (
                    <p className="text-xs text-muted-foreground -mt-1">
                      Targeted hate and tech cards to swap in against common
                      strategies.
                    </p>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {cat.cards.map((card) => (
                      <div
                        key={card.name}
                        className={`rounded-xl border overflow-hidden flex flex-col ${
                          isSideboard
                            ? 'border-accent/30 bg-accent/5'
                            : 'border-border bg-card'
                        }`}
                      >
                        {(card.scryfall?.image_uris?.normal ??
                        card.scryfall?.card_faces?.[0]?.image_uris?.normal) ? (
                          <img
                            src={
                              (card.scryfall?.image_uris?.normal ??
                                card.scryfall?.card_faces?.[0]?.image_uris
                                  ?.normal)!
                            }
                            alt={card.name}
                            className="w-full aspect-[488/680] object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full aspect-[488/680] bg-muted flex items-center justify-center text-xs text-muted-foreground">
                            {t('deckRecs.noImage')}
                          </div>
                        )}
                        <div className="p-3 space-y-1.5 flex-1 flex flex-col">
                          <p className="text-sm font-medium leading-tight">
                            <OracleText text={card.name} size="sm" />
                          </p>
                          <p className="text-xs text-muted-foreground flex-1">
                            <OracleText text={card.reason} size="sm" />
                          </p>
                          {card.scryfall?.prices?.usd && (
                            <p className="text-xs font-medium text-primary">
                              ${card.scryfall.prices.usd}
                            </p>
                          )}
                          <div className="flex gap-1.5 pt-1">
                            <button
                              onClick={() => copyName(card.name)}
                              className="text-xs px-2 py-1 rounded bg-secondary hover:bg-secondary/80 transition-colors flex items-center gap-1"
                            >
                              {copiedCard === card.name ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                              {t('deckRecs.copy')}
                            </button>
                            {card.scryfall?.scryfall_uri && (
                              <a
                                href={card.scryfall.scryfall_uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs px-2 py-1 rounded bg-secondary hover:bg-secondary/80 transition-colors flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Scryfall
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
