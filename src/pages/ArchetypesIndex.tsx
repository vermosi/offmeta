/**
 * Data-driven metagame browser — MTGTop8-style two-tier layout.
 * Format → Macro Category (Aggro X%, Control Y%) → Specific Deck Names
 */

import { useEffect, useState } from 'react';
import { applySeoMeta } from '@/lib/seo';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ManaSymbol } from '@/components/ManaSymbol';
import { Badge } from '@/components/ui/badge';
import { useArchetypeData, useArchetypeTrends, useSignatureCards } from '@/hooks';
import {
  ArrowLeft,
  Compass,
  Layers,
  Loader2,
  TrendingUp,
  TrendingDown,
  Sparkles,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { SkipLinks } from '@/components/SkipLinks';

const MACRO_COLORS: Record<string, string> = {
  Aggro: 'text-destructive',
  Control: 'text-primary',
  Combo: 'text-accent',
  Midrange: 'text-success',
};

const MACRO_BG: Record<string, string> = {
  Aggro: 'border-destructive/20 bg-destructive/5',
  Control: 'border-primary/20 bg-primary/5',
  Combo: 'border-accent/20 bg-accent/5',
  Midrange: 'border-success/20 bg-success/5',
};

export default function ArchetypesIndex() {
  const { t } = useTranslation();
  const { data: formatData, isLoading } = useArchetypeData();
  const [activeFormat, setActiveFormat] = useState<string | null>(null);

  const effectiveFormat =
    activeFormat ??
    (formatData && formatData.length > 0 ? formatData[0].format : null);
  const { data: trends } = useArchetypeTrends(effectiveFormat);
  const { data: signatureCards } = useSignatureCards(effectiveFormat);
  const totalDecks = formatData?.reduce((sum, f) => sum + f.totalDecks, 0) ?? 0;
  const totalDeckNames =
    formatData?.reduce(
      (sum, f) => sum + f.macroGroups.reduce((gs, g) => gs + g.decks.length, 0),
      0,
    ) ?? 0;

  useEffect(() => {
    return applySeoMeta({
      title: 'MTG Metagame — Deck Archetypes by Format | OffMeta',
      description: `Explore ${totalDeckNames} deck archetypes across ${formatData?.length ?? 0} formats, discovered from ${totalDecks} community decklists. Metagame breakdown with trend data.`,
      url: 'https://offmeta.app/archetypes',
      type: 'website',
    });
  }, [totalDeckNames, totalDecks, formatData?.length]);

  const activeData = formatData?.find((f) => f.format === effectiveFormat);

  const breadcrumbJsonLd = {
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
        name: 'Archetypes',
        item: 'https://offmeta.app/archetypes',
      },
    ],
  };

  return (
    <div className="min-h-screen flex flex-col bg-background relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div
        className="fixed inset-0 pointer-events-none bg-page-gradient"
        aria-hidden="true"
      />
      <div
        className="fixed inset-0 pointer-events-none bg-page-noise"
        aria-hidden="true"
      />

      <SkipLinks />
      <Header />

      <main id="main-content" className="relative flex-1 pt-6 sm:pt-10 pb-16">
        <div className="container-main max-w-4xl">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('archetypes.backToSearch')}
          </Link>

          <div className="space-y-2 mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
              <Compass className="h-7 w-7 text-primary" />
              Metagame Breakdown
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
              Deck archetypes discovered from tournament decklists across
              multiple formats. Data sourced from Spicerack.gg community events.
            </p>
            {totalDecks > 0 && (
              <p className="text-xs text-muted-foreground">
                {totalDeckNames} deck archetypes · {totalDecks.toLocaleString()}{' '}
                decklists analyzed
              </p>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !formatData || formatData.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-sm text-muted-foreground">
                No metagame data available yet. Run the detect-archetypes
                function with backfill to populate.
              </p>
            </div>
          ) : (
            <>
              {/* Format tabs */}
              <div className="relative mb-6">
                <div
                  className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none"
                  role="tablist"
                >
                  {formatData.map((fd) => (
                    <button
                      key={fd.format}
                      role="tab"
                      aria-selected={effectiveFormat === fd.format}
                      onClick={() => setActiveFormat(fd.format)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                        effectiveFormat === fd.format
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      {fd.label}
                      <span className="ml-1.5 text-xs opacity-70">
                        ({fd.totalDecks})
                      </span>
                    </button>
                  ))}
                </div>
                {/* Fade hint for off-screen tabs on mobile */}
                <div
                  className="absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none sm:hidden"
                  aria-hidden="true"
                />
              </div>

              {/* Two-tier metagame display */}
              {activeData && (
                <div className="space-y-6">
                  {activeData.macroGroups.map((group) => (
                    <section
                      key={group.macro}
                      className={`rounded-xl border p-5 sm:p-6 ${MACRO_BG[group.macro] ?? 'border-border/50 bg-card/50'}`}
                    >
                      {/* Macro category header */}
                      <div className="flex items-center gap-2 mb-4">
                        <h2
                          className={`text-lg font-bold ${MACRO_COLORS[group.macro] ?? 'text-foreground'}`}
                        >
                          {group.macro}
                        </h2>
                        <Badge
                          variant="secondary"
                          className="text-xs font-semibold px-2"
                        >
                          {group.metaPercentage}%
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {group.totalDecks} decks
                        </span>
                      </div>

                      {/* Deck name grid */}
                      <div className="grid gap-2 sm:grid-cols-2">
                        {group.decks.map((deck) => {
                          const trend = trends?.get(deck.deckName);
                          const sig = signatureCards?.get(deck.deckName);
                          return (
                            <Link
                              key={`${deck.format}-${deck.deckName}`}
                              to={`/archetypes/${deck.archetype}?format=${deck.format}`}
                              className="group flex items-center gap-3 p-2.5 sm:p-3 rounded-lg border border-border/40 bg-background/50 hover:bg-background hover:border-border transition-all hover:shadow-sm"
                            >
                              {/* Card art thumbnail */}
                              <div className="relative h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 rounded overflow-hidden bg-muted/50">
                                {sig?.imageUrl ? (
                                  <img
                                    src={sig.imageUrl}
                                    alt=""
                                    loading="lazy"
                                    className="absolute inset-0 h-full w-full object-cover object-top"
                                  />
                                ) : (
                                  <span className="flex items-center justify-center h-full w-full">
                                    {deck.primaryColors.length > 0 ? (
                                      <ManaSymbol
                                        symbol={deck.primaryColors[0]}
                                        size="sm"
                                        className="h-4 w-4"
                                      />
                                    ) : (
                                      <Layers className="h-4 w-4 text-muted-foreground/40" />
                                    )}
                                  </span>
                                )}
                              </div>

                              {/* Color pips */}
                              <span className="inline-flex items-center gap-0.5 flex-shrink-0">
                                {deck.primaryColors.length > 0 ? (
                                  deck.primaryColors.map((c) => (
                                    <ManaSymbol
                                      key={c}
                                      symbol={c}
                                      size="sm"
                                      className="h-3.5 w-3.5"
                                    />
                                  ))
                                ) : (
                                  <ManaSymbol
                                    symbol="C"
                                    size="sm"
                                    className="h-3.5 w-3.5"
                                  />
                                )}
                              </span>

                              {/* Deck name + meta % */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                                    {deck.deckName}
                                  </span>
                                  {trend && trend.direction === 'up' && (
                                    <TrendingUp className="h-3 w-3 text-success flex-shrink-0" />
                                  )}
                                  {trend && trend.direction === 'down' && (
                                    <TrendingDown className="h-3 w-3 text-destructive flex-shrink-0" />
                                  )}
                                  {trend && trend.direction === 'new' && (
                                    <Sparkles className="h-3 w-3 text-warning flex-shrink-0" />
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-muted-foreground">
                                    {deck.metaPercentage}% meta ·{' '}
                                    {deck.deckCount} decks
                                  </span>
                                  {sig && (
                                    <span className="text-[10px] text-muted-foreground/60 truncate hidden sm:inline">
                                      · {sig.cardName}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <Layers className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
                            </Link>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
