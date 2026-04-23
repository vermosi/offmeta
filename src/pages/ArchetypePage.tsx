/**
 * Data-driven archetype detail page.
 * Loads community deck data for a specific archetype,
 * optionally enriched with curated editorial content.
 */

import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ManaSymbol } from '@/components/ManaSymbol';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ARCHETYPES, getArchetypeForFormat } from '@/data/archetypes';
import { supabase } from '@/integrations/supabase/client';
import {
  Compass,
  ExternalLink,
  Lightbulb,
  Star,
  DollarSign,
  Search,
  Layers,
  Loader2,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { SkipLinks } from '@/components/SkipLinks';
import { SunsetBanner } from '@/components/SunsetBanner';
import { useNoIndex } from '@/hooks';
import { applySeoMeta } from '@/lib/seo';

/** Format names for display */
const FORMAT_LABELS: Record<string, string> = {
  commander: 'Commander',
  pauper: 'Pauper',
  legacy: 'Legacy',
  premodern: 'Premodern',
  other: 'Other',
};

function formatArchetypeName(slug: string): string {
  const names: Record<string, string> = {
    aristocrats: 'Aristocrats',
    artifacts: 'Artifacts',
    aggro: 'Aggro',
    blink: 'Blink / Flicker',
    combo: 'Combo',
    control: 'Control',
    counters: '+1/+1 Counters',
    enchantress: 'Enchantress',
    graveyard: 'Graveyard',
    landfall: 'Landfall',
    lifegain: 'Lifegain',
    ramp: 'Ramp',
    spellslinger: 'Spellslinger',
    stax: 'Stax',
    tokens: 'Tokens',
    treasure: 'Treasure',
    tribal: 'Tribal',
    voltron: 'Voltron',
    wheels: 'Wheels',
  };
  return names[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
}

interface DeckRow {
  id: string;
  name: string;
  format: string;
  commander: string | null;
  colors: string[];
  created_at: string;
  source_url: string | null;
}

interface TopCard {
  card_name: string;
  count: number;
}

function useArchetypeDecks(archetype: string, format: string | null) {
  return useQuery({
    queryKey: ['archetype-decks', archetype, format],
    queryFn: async () => {
      let query = supabase
        .from('community_decks')
        .select('id, name, format, commander, colors, created_at, source_url')
        .eq('archetype', archetype)
        .order('created_at', { ascending: false })
        .limit(50);

      if (format) {
        query = query.eq('format', format);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as DeckRow[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

function useArchetypeTopCards(archetype: string, format: string | null) {
  return useQuery({
    queryKey: ['archetype-top-cards', archetype, format],
    queryFn: async () => {
      // Get deck IDs for this archetype
      let deckQuery = supabase
        .from('community_decks')
        .select('id')
        .eq('archetype', archetype);

      if (format) {
        deckQuery = deckQuery.eq('format', format);
      }

      const { data: decks, error: deckErr } = await deckQuery;
      if (deckErr) throw deckErr;
      if (!decks || decks.length === 0) return [];

      const deckIds = decks.map((d) => d.id);

      // Get most common cards across these decks
      const { data: cards, error: cardErr } = await supabase
        .from('community_deck_cards')
        .select('card_name, scryfall_oracle_id')
        .in('deck_id', deckIds.slice(0, 100));

      if (cardErr) throw cardErr;
      if (!cards || cards.length === 0) return [];

      // Filter cards by format legality when a format is selected
      let allowedCards: Set<string> | null = null;
      if (format) {
        const oracleIds = [...new Set(
          cards.map((c) => c.scryfall_oracle_id).filter(Boolean) as string[]
        )];
        if (oracleIds.length > 0) {
          const { data: cardRows } = await supabase
            .from('cards')
            .select('name, legalities')
            .in('oracle_id', oracleIds.slice(0, 200));
          if (cardRows && cardRows.length > 0) {
            allowedCards = new Set(
              cardRows
                .filter((r) => {
                  const legalities = r.legalities as Record<string, string> | null;
                  return legalities && legalities[format] === 'legal';
                })
                .map((r) => r.name)
            );
          }
        }
      }

      // Count frequency
      const freq = new Map<string, number>();
      for (const c of cards) {
        if (allowedCards && !allowedCards.has(c.card_name)) continue;
        freq.set(c.card_name, (freq.get(c.card_name) ?? 0) + 1);
      }

      // Sort by frequency and filter out basic lands
      const basicLands = new Set([
        'Plains', 'Island', 'Swamp', 'Mountain', 'Forest',
        'Snow-Covered Plains', 'Snow-Covered Island', 'Snow-Covered Swamp',
        'Snow-Covered Mountain', 'Snow-Covered Forest',
      ]);

      return Array.from(freq.entries())
        .filter(([name]) => !basicLands.has(name))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([card_name, count]): TopCard => ({ card_name, count }));
    },
    staleTime: 10 * 60 * 1000,
  });
}

function useArchetypeFormats(archetype: string) {
  return useQuery({
    queryKey: ['archetype-formats', archetype],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_decks')
        .select('format')
        .eq('archetype', archetype);

      if (error) throw error;

      const counts = new Map<string, number>();
      for (const row of data ?? []) {
        const f = row.format ?? 'other';
        counts.set(f, (counts.get(f) ?? 0) + 1);
      }

      return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([format, count]) => ({ format, count, label: FORMAT_LABELS[format] ?? format }));
    },
    staleTime: 10 * 60 * 1000,
  });
}

export default function ArchetypePage() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const format = searchParams.get('format');

  const displayName = formatArchetypeName(slug ?? '');
  const curated = ARCHETYPES.find((a) => a.slug === slug);
  const formatContent = useMemo(
    () => curated ? getArchetypeForFormat(curated, format) : null,
    [curated, format],
  );

  const { data: decks, isLoading: decksLoading } = useArchetypeDecks(slug ?? '', format);
  const { data: topCards } = useArchetypeTopCards(slug ?? '', format);
  const { data: formats } = useArchetypeFormats(slug ?? '');

  useNoIndex(true);

  const totalDecks = useMemo(() => {
    if (!formats) return 0;
    return formats.reduce((sum, f) => sum + f.count, 0);
  }, [formats]);

  const formatLabel = format ? (FORMAT_LABELS[format] ?? format) : null;

  useEffect(() => {
    if (!slug) return;
    return applySeoMeta({
      title: `${displayName}${formatLabel ? ` (${formatLabel})` : ''} Archetype — Strategy & Decklists | OffMeta`,
      description: curated?.tagline
        ? `${curated.tagline}. Explore ${totalDecks} ${displayName} decklists from the community.`
        : `Explore ${totalDecks} ${displayName} decklists across multiple formats. Data-driven archetype discovery.`,
      url: `https://offmeta.app/archetypes/${slug}${format ? `?format=${format}` : ''}`,
    });
  }, [slug, displayName, formatLabel, totalDecks, curated?.tagline, format]);

  const handleSearch = useCallback(
    (query: string) => {
      navigate(`/?q=${encodeURIComponent(query)}`);
    },
    [navigate],
  );

  // Related archetypes from the same format
  const relatedArchetypes = useMemo(() => {
    if (!formats || !slug) return [];
    // Find other archetypes in the same format by querying curated data
    return ARCHETYPES.filter((a) => a.slug !== slug).slice(0, 4);
  }, [slug, formats]);

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'OffMeta', item: 'https://offmeta.app/' },
      { '@type': 'ListItem', position: 2, name: 'Archetypes', item: 'https://offmeta.app/archetypes' },
      { '@type': 'ListItem', position: 3, name: displayName, item: `https://offmeta.app/archetypes/${slug}` },
    ],
  };

  if (!slug) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <h1 className="text-lg font-semibold text-foreground">Archetype not found</h1>
            <Link to="/archetypes" className="text-sm text-primary hover:underline">
              Browse all archetypes
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background relative">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className="fixed inset-0 pointer-events-none bg-page-gradient" aria-hidden="true" />
      <div className="fixed inset-0 pointer-events-none bg-page-noise" aria-hidden="true" />

      <SkipLinks />
      <Header />

      <nav className="container-main pt-4 sm:pt-6 pb-2" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <li><Link to="/" className="hover:text-foreground transition-colors">{t('nav.home')}</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link to="/archetypes" className="hover:text-foreground transition-colors">Archetypes</Link></li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground font-medium truncate">{displayName}</li>
        </ol>
      </nav>

      <main id="main-content" className="relative flex-1 pt-2 sm:pt-4 pb-16">
        <div className="container-main max-w-3xl">
          <div className="mb-6">
            <SunsetBanner feature="Archetypes" />
          </div>
          {/* Header */}
          <div className="space-y-3 mb-8">
            <div className="flex items-center gap-2.5">
              {curated && (
                <span className="inline-flex items-center gap-1">
                  {curated.colors.map((c) => (
                    <ManaSymbol key={c} symbol={c} size="sm" className="h-5 w-5" />
                  ))}
                </span>
              )}
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">{displayName}</h1>
              {formatLabel && (
                <Badge variant="outline" className="text-xs">
                  {formatLabel}
                </Badge>
              )}
            </div>
            {curated && (
              <p className="text-sm text-muted-foreground italic">{curated.tagline}</p>
            )}
          </div>

          {/* Format picker — show all formats this archetype appears in */}
          {formats && formats.length > 1 && (
            <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
              <Link
                to={`/archetypes/${slug}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  !format
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                All ({totalDecks})
              </Link>
              {formats.map((f) => (
                <Link
                  key={f.format}
                  to={`/archetypes/${slug}?format=${f.format}`}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    format === f.format
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  {f.label} ({f.count})
                </Link>
              ))}
            </div>
          )}

          {/* Strategy overview (from curated data) */}
          {curated && formatContent && (
            <section className="rounded-xl border border-border/50 bg-card/50 p-5 sm:p-6 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Compass className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">{t('archetypes.strategyOverview')}</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {formatContent.description}
              </p>
            </section>
          )}

          {/* Top cards from community data */}
          {topCards && topCards.length > 0 && (
            <section className="rounded-xl border border-border/50 bg-card/50 p-5 sm:p-6 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Star className="h-4 w-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-foreground">
                  Most Played Cards
                </h2>
                <span className="text-[10px] text-muted-foreground ml-auto">from community decklists</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {topCards.map((card) => (
                  <button
                    key={card.card_name}
                    onClick={() => handleSearch(card.card_name)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/60 bg-muted/30 text-xs font-medium text-foreground hover:bg-muted/60 hover:border-border transition-colors"
                    title={`Search for ${card.card_name} · In ${card.count} decks`}
                  >
                    {card.card_name}
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      ({card.count})
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Search CTA */}
          {curated && formatContent && (
            <section className="rounded-xl border border-primary/20 bg-primary/5 p-5 sm:p-6 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Search className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">
                  Find {displayName} Cards{formatLabel ? ` (${formatLabel})` : ''}
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Pre-built search query for {formatLabel ?? 'Commander'} {displayName} staples:
              </p>
              <div className="rounded-lg bg-muted/50 border border-border/50 px-4 py-2.5 mb-4">
                <code className="text-xs text-foreground break-all">{formatContent.searchQuery}</code>
              </div>
              <Button
                onClick={() => handleSearch(formatContent.searchQuery)}
                className="gap-2"
                size="sm"
              >
                <Search className="h-3.5 w-3.5" />
                Search Cards
              </Button>
            </section>
          )}

          {/* Budget tips (curated) */}
          {curated && formatContent && (
            <section className="rounded-xl border border-border/50 bg-card/50 p-5 sm:p-6 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                <h2 className="text-sm font-semibold text-foreground">{t('archetypes.budgetAlternatives')}</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {formatContent.budgetTip}
              </p>
            </section>
          )}

          {/* Community decklists */}
          <section className="rounded-xl border border-border/50 bg-card/50 p-5 sm:p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Community Decklists</h2>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-normal ml-auto">
                {decks?.length ?? 0} decks
              </Badge>
            </div>

            {decksLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !decks || decks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No community decklists found for this archetype yet.
              </p>
            ) : (
              <div className="space-y-2">
                {decks.slice(0, 15).map((deck) => {
                  const Wrapper = deck.source_url ? 'a' : 'div';
                  const wrapperProps = deck.source_url
                    ? { href: deck.source_url, target: '_blank', rel: 'noopener noreferrer' }
                    : {};
                  return (
                    <Wrapper
                      key={deck.id}
                      {...wrapperProps}
                      className={`flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:bg-muted/20 transition-colors ${deck.source_url ? 'cursor-pointer' : ''}`}
                    >
                      <span className="inline-flex items-center gap-0.5 flex-shrink-0">
                        {(deck.colors ?? []).length > 0 ? (
                          deck.colors.map((c) => (
                            <ManaSymbol key={c} symbol={c} size="sm" className="h-3.5 w-3.5" />
                          ))
                        ) : (
                          <ManaSymbol symbol="C" size="sm" className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{deck.name}</p>
                        {deck.commander && (
                          <p className="text-[10px] text-muted-foreground truncate">{deck.commander}</p>
                        )}
                      </div>
                      {deck.source_url && (
                        <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      )}
                      <Badge variant="outline" className="text-[10px] flex-shrink-0">
                        {FORMAT_LABELS[deck.format] ?? deck.format}
                      </Badge>
                    </Wrapper>
                  );
                })}
                {decks.length > 15 && (
                  <p className="text-[10px] text-muted-foreground text-center pt-2">
                    Showing 15 of {decks.length} decklists
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Related archetypes */}
          {relatedArchetypes.length > 0 && (
            <section className="rounded-xl border border-border/50 bg-card/50 p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Related Archetypes</h2>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {relatedArchetypes.map((r) => (
                  <Link
                    key={r.slug}
                    to={`/archetypes/${r.slug}${format ? `?format=${format}` : ''}`}
                    className="flex items-center gap-2 p-3 rounded-lg border border-border/40 hover:bg-muted/30 hover:border-border transition-colors"
                  >
                    <span className="inline-flex items-center gap-0.5">
                      {r.colors.map((c) => (
                        <ManaSymbol key={c} symbol={c} size="sm" className="h-3.5 w-3.5" />
                      ))}
                    </span>
                    <span className="text-xs font-medium text-foreground">{r.name}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
