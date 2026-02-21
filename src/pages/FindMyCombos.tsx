/**
 * Find My Combos page.
 * Users paste a decklist or Moxfield URL to discover combos in their deck
 * using the Commander Spellbook API.
 */

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { parseDecklist } from '@/lib/decklist-parser';
import { supabase } from '@/integrations/supabase/client';
import { ManaSymbol, OracleText } from '@/components/ManaSymbol';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { SkipLinks } from '@/components/SkipLinks';
import {
  Loader2,
  Zap,
  Link2,
  FileText,
  ChevronDown,
  ChevronUp,
  ExternalLink,
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

interface ComboCard {
  name: string;
  imageUrl?: string;
  typeLine?: string;
}

interface Combo {
  id: string;
  cards: ComboCard[];
  description: string;
  prerequisites: string;
  produces: string[];
  identity: string;
  popularity: number;
  prices?: {
    tcgplayer?: string;
    cardmarket?: string;
    cardkingdom?: string;
  };
}

interface ComboResults {
  identity: string;
  included: Combo[];
  almostIncluded: Combo[];
  totalIncluded: number;
  totalAlmostIncluded: number;
}

type InputMode = 'url' | 'paste';

function ComboItem({
  combo,
  expanded,
  onToggle,
}: {
  combo: Combo;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Collapsible open={expanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <button className="w-full text-left rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/60 transition-colors p-3 group">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-1 mb-1.5">
                {combo.cards
                  .filter((c) => !c.name.startsWith('[Any]'))
                  .map((c, i) => (
                    <Badge key={i} variant="secondary" className="text-xs font-normal">
                      <OracleText text={c.name} size="sm" />
                    </Badge>
                  ))}
                {combo.cards
                  .filter((c) => c.name.startsWith('[Any]'))
                  .map((c, i) => (
                    <Badge key={`t-${i}`} variant="outline" className="text-xs font-normal italic">
                      <OracleText text={c.name.replace('[Any] ', '')} size="sm" />
                    </Badge>
                  ))}
              </div>
              <div className="flex flex-wrap gap-1">
                {combo.produces.slice(0, 3).map((p, i) => (
                  <span key={i} className="text-xs text-primary/80 flex items-center gap-0.5">
                    <Sparkles className="h-3 w-3" />
                    <OracleText text={p} size="sm" />
                  </span>
                ))}
                {combo.produces.length > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{combo.produces.length - 3} more
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              {combo.identity && (
                <Badge variant="outline" className="text-xs">
                  {combo.identity}
                </Badge>
              )}
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border border-t-0 border-border/50 rounded-b-lg bg-background p-3 space-y-3">
          {/* Card images */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {combo.cards
              .filter((c) => c.imageUrl)
              .map((c, i) => (
                <img
                  key={i}
                  src={c.imageUrl}
                  alt={c.name}
                  className="h-32 rounded-md flex-shrink-0"
                  loading="lazy"
                />
              ))}
          </div>

          {combo.description && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Steps</p>
              <ol className="text-xs space-y-0.5 list-decimal list-inside text-foreground/90">
                {combo.description
                  .split('\n')
                  .filter(Boolean)
                  .map((step, i) => (
                    <li key={i}><OracleText text={step.replace(/^\d+\.\s*/, '')} size="sm" /></li>
                  ))}
              </ol>
            </div>
          )}

          {combo.prerequisites && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Prerequisites</p>
              <ul className="text-xs space-y-0.5 list-disc list-inside text-foreground/70">
                {combo.prerequisites
                  .split('\n')
                  .filter(Boolean)
                  .map((p, i) => (
                    <li key={i}><OracleText text={p} size="sm" /></li>
                  ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between">
            {combo.prices?.tcgplayer && (
              <span className="text-xs text-muted-foreground">
                Combo cost: ~${combo.prices.tcgplayer}
              </span>
            )}
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" asChild>
              <a
                href={`https://commanderspellbook.com/combo/${combo.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Commander Spellbook
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function FindMyCombos() {
  const { t } = useTranslation();

  useEffect(() => {
    const prev = document.title;
    document.title = 'Find My Combos — OffMeta MTG';
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.id = 'combos-jsonld';
    s.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'OffMeta', item: 'https://offmeta.app/' },
        { '@type': 'ListItem', position: 2, name: 'Combos', item: 'https://offmeta.app/combos' },
      ],
    });
    document.head.appendChild(s);
    return () => {
      document.title = prev;
      document.getElementById('combos-jsonld')?.remove();
    };
  }, []);
  const [inputMode, setInputMode] = useState<InputMode>('url');
  const [rawText, setRawText] = useState('');
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
  const [filterCardCount, setFilterCardCount] = useState<string>('any');
  const [sortBy, setSortBy] = useState<string>('popularity');

  const hasActiveFilters = filterColors.length > 0 || filterCardCount !== 'any' || sortBy !== 'popularity';

  const clearFilters = () => {
    setFilterColors([]);
    setFilterCardCount('any');
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
    if (filterCardCount === '2') filtered = filtered.filter((c) => c.cards.length === 2);
    else if (filterCardCount === '3') filtered = filtered.filter((c) => c.cards.length === 3);
    else if (filterCardCount === '4+') filtered = filtered.filter((c) => c.cards.length >= 4);

    if (sortBy === 'popularity') filtered.sort((a, b) => b.popularity - a.popularity);
    else if (sortBy === 'cards-asc') filtered.sort((a, b) => a.cards.length - b.cards.length);
    else if (sortBy === 'cards-desc') filtered.sort((a, b) => b.cards.length - a.cards.length);

    return filtered;
  };

  const handleFetchMoxfield = async () => {
    if (!moxfieldUrl.trim()) return;
    setFetchingDeck(true);
    setMoxfieldDeckName(null);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-moxfield-deck', {
        body: { url: moxfieldUrl.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setRawText(data.decklist);
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

  const handleParse = () => {
    if (!rawText.trim()) return;
    const p = parseDecklist(rawText);
    setCommander(p.commander);
    setCardNames(p.cards.map((c) => c.name));
    setColorIdentity([]);
    setResults(null);
    setError(null);
    if (p.cards.length === 0) {
      toast.error('No cards found. Check the format.');
    }
  };

  const handleFindCombos = async () => {
    if (cardNames.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const commanders = commander ? [commander] : [];
      const { data, error: fnError } = await supabase.functions.invoke('combo-search', {
        body: {
          action: 'deck',
          commanders,
          cards: cardNames,
        },
      });
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
            <div className="flex gap-1 p-1 bg-secondary/50 rounded-lg w-fit">
              <button
                onClick={() => setInputMode('url')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                  inputMode === 'url'
                    ? 'bg-background text-foreground shadow-sm font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Link2 className="h-3.5 w-3.5" />
                {t('combos.moxfieldUrl')}
              </button>
              <button
                onClick={() => setInputMode('paste')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                  inputMode === 'paste'
                    ? 'bg-background text-foreground shadow-sm font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                {t('combos.pasteList')}
              </button>
            </div>

            {inputMode === 'url' ? (
              <div className="space-y-3">
                <label className="text-sm font-medium">{t('combos.moxfieldLabel')}</label>
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
                  {fetchingDeck ? t('combos.importing') : t('combos.importButton')}
                </Button>
                {moxfieldDeckName && (
                  <p className="text-xs text-muted-foreground">
                    ✓ {t('combos.imported')}:{' '}
                    <span className="font-medium text-foreground">{moxfieldDeckName}</span>
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <label className="text-sm font-medium">{t('combos.pasteLabel')}</label>
                <Textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`COMMANDER: Thrasios, Triton Hero\n1 Sol Ring\n1 Demonic Consultation\n1 Thassa's Oracle\n1 Mana Crypt`}
                  className="min-h-[260px] font-mono text-xs"
                  maxLength={10000}
                />
                <Button onClick={handleParse} variant="secondary" className="w-full">
                  {t('combos.parseButton')}
                </Button>
              </div>
            )}
          </div>

          {/* Summary + find button */}
          <div className="rounded-xl border border-border p-4 space-y-3">
            <h2 className="text-sm font-semibold">{t('combos.deckSummary')}</h2>
            {cardNames.length > 0 ? (
              <>
                <div className="text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">{t('combos.commander')}:</span>{' '}
                    {commander || t('combos.notDetected')}
                  </p>
                  {colorIdentity.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">{t('combos.colors')}:</span>
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
                    <span className="text-muted-foreground">{t('combos.cards')}:</span> {cardNames.length}
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
                {inputMode === 'url'
                  ? t('combos.emptyUrl')
                  : t('combos.emptyPaste')}
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
        {results && !loading && (() => {
          const filteredIncluded = filterAndSortCombos(results.included);
          const filteredAlmost = filterAndSortCombos(results.almostIncluded);
          return (
          <div className="space-y-6">
            {/* Filter toolbar */}
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/50 bg-muted/30 p-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground mr-1">Colors:</span>
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
                <span className="text-xs text-muted-foreground mr-1">Cards:</span>
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
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-xs bg-secondary/60 border-none rounded px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="popularity">Popularity</option>
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

            {/* Included combos */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">
                  {t('combos.combosInDeck')} ({filteredIncluded.length})
                </h2>
              </div>
              {filteredIncluded.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {hasActiveFilters ? 'No combos match the current filters.' : t('combos.noCombos')}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredIncluded.map((combo) => (
                    <ComboItem
                      key={combo.id}
                      combo={combo}
                      expanded={expandedCombo === combo.id}
                      onToggle={() =>
                        setExpandedCombo(expandedCombo === combo.id ? null : combo.id)
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
                        setExpandedCombo(expandedCombo === combo.id ? null : combo.id)
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
