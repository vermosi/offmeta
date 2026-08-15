/**
 * Find My Combos page.
 * Users import a Moxfield URL to discover combos in their deck
 * using the Commander Spellbook API.
 */

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { invokeComboSearch } from '@/services/combo-search';
import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError } from '@supabase/supabase-js';

import { applySeoMeta, injectJsonLd } from '@/lib/seo';
import { useAnalytics } from '@/hooks/useAnalytics';
import { ManaSymbol } from '@/components/ManaSymbol';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { SkipLinks } from '@/components/SkipLinks';
import { ComboItem } from '@/components/find-my-combos/ComboItem';
import { SharePageButton } from '@/components/SharePageButton';
import type { Combo, ComboResults } from '@/components/find-my-combos/types';
import {
  Loader2,
  Zap,
  Link2,
  Sparkles,
  AlertTriangle,
  X,
  ArrowUpDown,
} from 'lucide-react';
import { toast } from 'sonner';

const WUBRG = ['W', 'U', 'B', 'R', 'G'] as const;
const COLOR_NAMES: Record<string, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
};

type SortMode =
  | 'popularity'
  | 'cards-asc'
  | 'cards-desc'
  | 'price-asc'
  | 'price-desc';
type PriceCeiling = 'any' | '10' | '25' | '50' | '100';

/** Pure helper – extract numeric price from a combo's tcgplayer field. */
const getComboPrice = (combo: Combo): number | null => {
  const raw = combo.prices?.tcgplayer;
  if (!raw) return null;
  const num = parseFloat(raw);
  return isNaN(num) ? null : num;
};

export default function FindMyCombos() {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    // Per-route SEO: title, description, canonical, og:url + BreadcrumbList JSON-LD.
    // Previously only title/description were set — canonical/og:url were left pointing at the homepage,
    // so /combos shared on Reddit/Discord/Slack showed the homepage preview.
    const cleanupMeta = applySeoMeta({
      title: t('combos.seoTitle', 'MTG Combo Finder for Commander Decks | OffMeta'),
      description: t(
        'combos.seoDescription',
        'Paste a decklist or Moxfield URL to find infinite combos, near-combos, prices, and color identity with Commander Spellbook data.',
      ),
      url: 'https://offmeta.app/combos',
      type: 'website',
    });
    const cleanupJsonLd = injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'OffMeta', item: 'https://offmeta.app/' },
        { '@type': 'ListItem', position: 2, name: 'Combos', item: 'https://offmeta.app/combos' },
      ],
    });
    return () => {
      cleanupMeta();
      cleanupJsonLd();
    };
  }, [t]);
  const [moxfieldUrl, setMoxfieldUrl] = useState('');
  const [moxfieldDeckName, setMoxfieldDeckName] = useState<string | null>(null);
  const [fetchingDeck, setFetchingDeck] = useState(false);
  const [colorIdentity, setColorIdentity] = useState<string[]>([]);
  const [commander, setCommander] = useState<string | null>(null);
  const [cardNames, setCardNames] = useState<string[]>([]);

  const [results, setResults] = useState<ComboResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCombo, setExpandedCombo] = useState<string | null>(null);
  const [filterColors, setFilterColors] = useState<string[]>([]);
  const [filterCardCount, setFilterCardCount] = useState<
    'any' | '2' | '3' | '4+'
  >('any');
  const [filterPriceCeiling, setFilterPriceCeiling] =
    useState<PriceCeiling>('any');
  const [sortBy, setSortBy] = useState<SortMode>('popularity');

  const hasActiveFilters =
    filterColors.length > 0 ||
    filterCardCount !== 'any' ||
    filterPriceCeiling !== 'any' ||
    sortBy !== 'popularity';

  const clearFilters = () => {
    setFilterColors([]);
    setFilterCardCount('any');
    setFilterPriceCeiling('any');
    setSortBy('popularity');
  };

  const toggleColor = (c: string) =>
    setFilterColors((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );

  const filterAndSortCombos = (combos: Combo[]): Combo[] => {
    let filtered = [...combos];
    if (filterColors.length > 0) {
      filtered = filtered.filter((c) =>
        filterColors.some((color) => c.identity.toUpperCase().includes(color)),
      );
    }
    if (filterCardCount === '2')
      filtered = filtered.filter((c) => c.cards.length === 2);
    else if (filterCardCount === '3')
      filtered = filtered.filter((c) => c.cards.length === 3);
    else if (filterCardCount === '4+')
      filtered = filtered.filter((c) => c.cards.length >= 4);

    if (filterPriceCeiling !== 'any') {
      const ceiling = parseFloat(filterPriceCeiling);
      filtered = filtered.filter((c) => {
        const price = getComboPrice(c);
        // Include combos with unknown price so they aren't silently hidden
        return price === null || price <= ceiling;
      });
    }

    if (sortBy === 'popularity')
      filtered.sort((a, b) => b.popularity - a.popularity);
    else if (sortBy === 'cards-asc')
      filtered.sort((a, b) => a.cards.length - b.cards.length);
    else if (sortBy === 'cards-desc')
      filtered.sort((a, b) => b.cards.length - a.cards.length);
    else if (sortBy === 'price-asc') {
      filtered.sort(
        (a, b) =>
          (getComboPrice(a) ?? Infinity) - (getComboPrice(b) ?? Infinity),
      );
    } else if (sortBy === 'price-desc') {
      filtered.sort(
        (a, b) =>
          (getComboPrice(b) ?? -Infinity) - (getComboPrice(a) ?? -Infinity),
      );
    }

    return filtered;
  };

  const handleFetchMoxfield = async () => {
    const url = moxfieldUrl.trim();
    if (!url) return;
    setFetchingDeck(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke<{
        deckName: string;
        commanders: string[];
        cards: string[];
        colorIdentity: string[];
      }>('fetch-moxfield-deck', { body: { url } });

      if (fnError) {
        const details =
          fnError instanceof FunctionsHttpError
            ? await fnError.context.text()
            : fnError.message;
        let message = t('combos.importError', 'Could not import that deck');
        try {
          message = (JSON.parse(details) as { error?: string }).error ?? message;
        } catch {
          /* non-JSON error body */
        }
        throw new Error(message);
      }
      if (!data) throw new Error(t('combos.importError', 'Could not import that deck'));

      setMoxfieldDeckName(data.deckName);
      setCommander(data.commanders[0] ?? null);
      setCardNames(data.cards);
      setColorIdentity(data.colorIdentity ?? []);
      setResults(null);
      toast.success(t('combos.importedToast', 'Imported {name}', { name: data.deckName }));
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : t('combos.importError', 'Could not import that deck');
      setError(message);
      toast.error(message);
    } finally {
      setFetchingDeck(false);
    }
  };


  const handleFindCombos = async () => {
    if (cardNames.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const commanders = commander ? [commander] : [];
      const data = await invokeComboSearch<ComboResults>(
        {
          action: 'deck',
          commanders,
          cards: cardNames,
        },
        {
          onRetry: (delayMs) => {
            toast.info(
              t('combos.retryToast', 'Too many requests — retrying in {seconds}s', {
                seconds: Math.ceil(delayMs / 1000),
              }),
            );
          },
        },
      );
      setResults(data);
      clearFilters();
      void trackEvent('combo_search_run', {
        deck_size: cardNames.length,
        has_commander: Boolean(commander),
        combos_found: data?.included?.length ?? 0,
        almost_included: data?.almostIncluded?.length ?? 0,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('combos.findError', 'Failed to find combos'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SkipLinks />
      <Header />
      <main id="main-content" className="mx-auto max-w-4xl px-4 pb-24">
        <p className="pt-10 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          {t('combos.eyebrow', 'OffMeta / Combos')}
        </p>
        <h1 className="mt-4 font-display text-4xl uppercase leading-[0.95] tracking-tight md:text-5xl">
          {t('combos.title')}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t('combos.subtitle')}
        </p>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          {t('combos.poweredBy')}{' '}
          <a
            href="https://commanderspellbook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            Commander Spellbook
          </a>
        </p>

        <div className="mt-8">
          <PageSearchBar
            placeholder={t(
              'combos.searchPlaceholder',
              'Search Magic cards in plain English…',
            )}
          />
        </div>

        {/* Input */}
        <section className="mt-10 border-t border-border pt-8 grid gap-8 md:grid-cols-2">
          <div>
            <label
              className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
              htmlFor="moxfield-url"
            >
              {t('combos.moxfieldLabel')}
            </label>
            <Input
              id="moxfield-url"
              type="url"
              inputMode="url"
              value={moxfieldUrl}
              onChange={(e) => setMoxfieldUrl(e.target.value)}
              placeholder="https://www.moxfield.com/decks/..."
              className="mt-3 rounded-none font-mono text-xs"
            />
            <Button
              onClick={handleFetchMoxfield}
              disabled={fetchingDeck || !moxfieldUrl.trim()}
              variant="secondary"
              className="mt-3 w-full gap-2 rounded-none"
            >
              {fetchingDeck ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              {fetchingDeck
                ? t('combos.importing')
                : t('combos.importButton')}
            </Button>
            {moxfieldDeckName && (
              <p className="mt-3 text-xs text-muted-foreground">
                ✓ {t('combos.imported')}:{' '}
                <span className="font-medium text-foreground">
                  {moxfieldDeckName}
                </span>
              </p>
            )}
          </div>

          {/* Summary + find button */}
          <div className="border border-border p-5">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              {t('combos.deckSummary')}
            </h2>
            {cardNames.length > 0 ? (
              <>
                <div className="mt-4 space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">
                      {t('combos.commander')}:
                    </span>{' '}
                    {commander || t('combos.notDetected')}
                  </p>
                  {colorIdentity.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">
                        {t('combos.colors')}:
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
                      {t('combos.cards')}:
                    </span>{' '}
                    {cardNames.length}
                  </p>
                </div>
                <Button
                  onClick={handleFindCombos}
                  disabled={loading || cardNames.length === 0}
                  className="mt-4 w-full gap-2 rounded-none"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  {loading ? t('combos.searching') : t('combos.findButton')}
                </Button>
              </>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                {t('combos.emptyUrl')}
              </p>
            )}
          </div>
        </section>

        {/* Loading */}
        {loading && (
          <div className="mt-10 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-none" />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-8 flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}


        {/* Results */}
        {results &&
          !loading &&
          (() => {
            const filteredIncluded = filterAndSortCombos(results.included);
            const filteredAlmost = filterAndSortCombos(results.almostIncluded);
            const nullPriceCount =
              filterPriceCeiling !== 'any'
                ? [...results.included, ...results.almostIncluded].filter(
                    (c) => getComboPrice(c) === null,
                  ).length
                : 0;
            return (
              <div className="mt-14 space-y-8 border-t border-border pt-8">
                {/* Filter toolbar */}
                <div className="flex flex-wrap items-center gap-3 border border-border/60 bg-muted/20 p-3">

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground mr-1">
                      {t('combos.colorsLabel', 'Colors:')}
                    </span>
                    {WUBRG.map((c) => (
                      <button
                        key={c}
                        onClick={() => toggleColor(c)}
                        className={`rounded-full p-0.5 transition-all ${
                          filterColors.includes(c)
                            ? 'ring-2 ring-primary ring-offset-1 ring-offset-background opacity-100'
                            : 'opacity-40 hover:opacity-70'
                        }`}
                        title={COLOR_NAMES[c]}
                      >
                        <ManaSymbol symbol={c} size="sm" />
                      </button>
                    ))}
                  </div>

                  <span className="hidden sm:block h-5 w-px bg-border" />

                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground mr-1">
                      {t('combos.cardsLabel', 'Cards:')}
                    </span>
                    {(['any', '2', '3', '4+'] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setFilterCardCount(v)}
                        className={`px-2 py-0.5 rounded text-xs transition-colors ${
                          filterCardCount === v
                            ? 'bg-primary text-primary-foreground font-medium'
                            : 'bg-secondary/60 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {v === 'any' ? t('combos.any', 'Any') : v}
                      </button>
                    ))}
                  </div>

                  <span className="hidden sm:block h-5 w-px bg-border" />

                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground mr-1">
                      {t('combos.budgetLabel', 'Budget:')}
                    </span>
                    {(['any', '10', '25', '50', '100'] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setFilterPriceCeiling(v)}
                        className={`px-2 py-0.5 rounded text-xs transition-colors ${
                          filterPriceCeiling === v
                            ? 'bg-primary text-primary-foreground font-medium'
                            : 'bg-secondary/60 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {v === 'any' ? t('combos.any', 'Any') : `≤$${v}`}
                      </button>
                    ))}
                  </div>

                  <span className="hidden sm:block h-5 w-px bg-border" />

                  <div className="flex items-center gap-1">
                    <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                    <select
                      aria-label={t('combos.sortLabel', 'Sort combos')}
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortMode)}
                      className="text-xs bg-secondary/60 border-none rounded px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="popularity">{t('combos.sort.popularity', 'Popularity')}</option>
                      <option value="price-asc">{t('combos.sort.priceAsc', 'Price: Low → High')}</option>
                      <option value="price-desc">{t('combos.sort.priceDesc', 'Price: High → Low')}</option>
                      <option value="cards-asc">{t('combos.sort.cardsAsc', 'Fewest cards')}</option>
                      <option value="cards-desc">{t('combos.sort.cardsDesc', 'Most cards')}</option>
                    </select>
                  </div>

                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-3 w-3" />
                      {t('combos.clear', 'Clear')}
                    </button>
                  )}
                </div>

                {nullPriceCount > 0 && (
                  <p className="text-xs text-muted-foreground italic">
                    {t('combos.unknownPriceNote', '{count} combo{plural} included with unknown price data.', {
                      count: nullPriceCount,
                      plural: nullPriceCount > 1 ? 's' : '',
                    })}
                  </p>
                )}

                {/* Included combos */}
                <section className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                      {t('combos.combosInDeck')} ({filteredIncluded.length})
                    </h2>
                    <div className="ml-auto">
                      <SharePageButton
                        title={t('combos.shareTitle', 'MTG Combo Finder — OffMeta')}
                        text={t('combos.shareText', 'Found {count} combos in this deck on OffMeta', { count: filteredIncluded.length })}
                        label={t('combos.shareLabel', 'Share results')}
                      />
                    </div>
                  </div>

                  {filteredIncluded.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {hasActiveFilters
                        ? t('combos.noMatchFilters', 'No combos match the current filters.')
                        : t('combos.noCombos')}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {filteredIncluded.map((combo) => (
                        <ComboItem
                          key={combo.id}
                          combo={combo}
                          expanded={expandedCombo === combo.id}
                          onToggle={() =>
                            setExpandedCombo(
                              expandedCombo === combo.id ? null : combo.id,
                            )
                          }
                        />
                      ))}
                    </div>
                  )}
                </section>

                {/* Almost included */}
                {filteredAlmost.length > 0 && (
                  <section className="space-y-3 border-t border-border pt-8">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-muted-foreground" />
                      <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                        {t('combos.almostIncluded')} ({filteredAlmost.length})
                      </h2>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {t('combos.almostDesc')}
                    </p>
                    <div className="space-y-2">
                      {filteredAlmost.map((combo) => (
                        <ComboItem
                          key={combo.id}
                          combo={combo}
                          expanded={expandedCombo === combo.id}
                          onToggle={() =>
                            setExpandedCombo(
                              expandedCombo === combo.id ? null : combo.id,
                            )
                          }
                        />
                      ))}
                    </div>
                  </section>
                )}

                <p className="text-xs text-center text-muted-foreground">
                  {t('combos.dataBy')}{' '}
                  <a
                    href="https://commanderspellbook.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-foreground"
                  >
                    Commander Spellbook
                  </a>
                </p>
              </div>
            );
          })()}
      </main>
      <Footer />
    </div>
  );
}
