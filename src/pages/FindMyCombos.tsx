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
import { parseDecklist } from '@/lib/decklist-parser';
import { supabase } from '@/integrations/supabase/client';
import { ManaSymbol } from '@/components/ManaSymbol';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { SkipLinks } from '@/components/SkipLinks';
import { PageSearchBar } from '@/components/PageSearchBar';
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

  useEffect(() => {
    const prev = document.title;
    const prevDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
    document.title = 'MTG Combo Finder — Powered by Commander Spellbook | OffMeta';
    const descEl = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    const newDesc = 'Find every infinite combo in your Magic: The Gathering deck. Paste a Moxfield URL and instantly see Commander Spellbook combos, prices & color identity.';
    if (descEl) descEl.content = newDesc;
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.id = 'combos-jsonld';
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
          name: 'Combos',
          item: 'https://offmeta.app/combos',
        },
      ],
    });
    document.head.appendChild(s);
    return () => {
      document.title = prev;
      if (descEl && prevDesc) descEl.content = prevDesc;
      document.getElementById('combos-jsonld')?.remove();
    };
  }, []);
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

      setMoxfieldDeckName(data.deckName);
      setColorIdentity(data.colorIdentity ?? []);
      const p = parseDecklist(data.decklist);
      setCommander(p.commander);
      setCardNames(p.cards.map((c) => c.name));
      setResults(null);
      setError(null);
      toast.success(`Imported "${data.deckName}" (${data.cardCount} cards)`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to fetch deck');
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
      const { data, error: fnError } = await supabase.functions.invoke(
        'combo-search',
        {
          body: {
            action: 'deck',
            commanders,
            cards: cardNames,
          },
        },
      );
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setResults(data as ComboResults);
      clearFilters();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to find combos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SkipLinks />
      <Header />
      <main id="main-content" className="container-main flex-1 py-8 space-y-8">
        <PageSearchBar placeholder="Search Magic cards in plain English…" />
        <div>
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">{t('combos.title')}</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {t('combos.subtitle')}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
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
        </div>

        {/* Input */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="space-y-3">
              <label className="text-sm font-medium">
                {t('combos.moxfieldLabel')}
              </label>
              <Input
                value={moxfieldUrl}
                onChange={(e) => setMoxfieldUrl(e.target.value)}
                placeholder="https://www.moxfield.com/decks/..."
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
                  ? t('combos.importing')
                  : t('combos.importButton')}
              </Button>
              {moxfieldDeckName && (
                <p className="text-xs text-muted-foreground">
                  ✓ {t('combos.imported')}:{' '}
                  <span className="font-medium text-foreground">
                    {moxfieldDeckName}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Summary + find button */}
          <div className="rounded-xl border border-border p-4 space-y-3">
            <h2 className="text-sm font-semibold">{t('combos.deckSummary')}</h2>
            {cardNames.length > 0 ? (
              <>
                <div className="text-sm space-y-1">
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
                  className="w-full gap-2"
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
              <p className="text-sm text-muted-foreground">
                {t('combos.emptyUrl')}
              </p>
            )}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive py-3">
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
              <div className="space-y-6">
                {/* Filter toolbar */}
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/50 bg-muted/30 p-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground mr-1">
                      Colors:
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
                      Cards:
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
                        {v === 'any' ? 'Any' : v}
                      </button>
                    ))}
                  </div>

                  <span className="hidden sm:block h-5 w-px bg-border" />

                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground mr-1">
                      Budget:
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
                        {v === 'any' ? 'Any' : `≤$${v}`}
                      </button>
                    ))}
                  </div>

                  <span className="hidden sm:block h-5 w-px bg-border" />

                  <div className="flex items-center gap-1">
                    <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortMode)}
                      className="text-xs bg-secondary/60 border-none rounded px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="popularity">Popularity</option>
                      <option value="price-asc">Price: Low → High</option>
                      <option value="price-desc">Price: High → Low</option>
                      <option value="cards-asc">Fewest cards</option>
                      <option value="cards-desc">Most cards</option>
                    </select>
                  </div>

                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-3 w-3" />
                      Clear
                    </button>
                  )}
                </div>

                {nullPriceCount > 0 && (
                  <p className="text-xs text-muted-foreground italic">
                    {nullPriceCount} combo{nullPriceCount > 1 ? 's' : ''}{' '}
                    included with unknown price data.
                  </p>
                )}

                {/* Included combos */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Zap className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold">
                      {t('combos.combosInDeck')} ({filteredIncluded.length})
                    </h2>
                    <div className="ml-auto">
                      <SharePageButton
                        title="MTG Combo Finder — OffMeta"
                        text={`Found ${filteredIncluded.length} combos in this deck on OffMeta`}
                        label="Share results"
                      />
                    </div>
                  </div>
                  {filteredIncluded.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {hasActiveFilters
                        ? 'No combos match the current filters.'
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
                  <section className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-muted-foreground" />
                      <h2 className="text-lg font-semibold text-muted-foreground">
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
