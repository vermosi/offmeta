/**
 * Data-driven archetype discovery — shows archetypes from community_decks
 * grouped by format with live deck counts.
 */

import { useEffect, useMemo } from 'react';
import { applySeoMeta } from '@/lib/seo';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ManaSymbol } from '@/components/ManaSymbol';
import { Badge } from '@/components/ui/badge';
import { useArchetypeData } from '@/hooks/useArchetypeData';
import { ArrowLeft, Compass, Layers, Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { SkipLinks } from '@/components/SkipLinks';

/** Capitalize first letter of archetype name */
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

/** Short description for archetypes without curated data */
function getArchetypeTagline(slug: string): string {
  const taglines: Record<string, string> = {
    aristocrats: 'Sacrifice creatures for incremental value',
    artifacts: 'Synergize with artifact permanents',
    aggro: 'Deal damage fast with aggressive creatures',
    blink: 'Abuse enter-the-battlefield triggers',
    combo: 'Assemble infinite or game-winning combos',
    control: 'Answer threats and win on your terms',
    counters: 'Grow creatures with +1/+1 counters',
    enchantress: 'Draw cards from enchantment synergies',
    graveyard: 'Use the graveyard as a second hand',
    landfall: 'Trigger abilities from land drops',
    lifegain: 'Gain life and convert it into power',
    ramp: 'Accelerate mana to cast big spells early',
    spellslinger: 'Chain instants and sorceries for value',
    stax: 'Lock down opponents with taxing effects',
    tokens: 'Go wide with an army of creature tokens',
    treasure: 'Generate treasure tokens for explosive mana',
    tribal: 'Build around a creature type',
    voltron: 'Suit up one creature and swing for lethal',
    wheels: 'Force everyone to discard and redraw',
  };
  return taglines[slug] ?? 'A community-discovered archetype';
}

export default function ArchetypesIndex() {
  const { t } = useTranslation();
  const { data: formatData, isLoading } = useArchetypeData();

  // Default to first format with data (derived, no effect needed)
  const activeFormat = useMemo(
    () => (formatData && formatData.length > 0 ? formatData[0].format : null),
    [formatData],
  );

  const totalDecks = formatData?.reduce((sum, f) => sum + f.totalDecks, 0) ?? 0;
  const totalArchetypes = formatData?.reduce((sum, f) => sum + f.archetypes.length, 0) ?? 0;

  useEffect(() => {
    return applySeoMeta({
      title: 'MTG Archetypes — Commander, Pauper, Legacy & More | OffMeta',
      description: `Explore ${totalArchetypes} deck archetypes across ${formatData?.length ?? 0} formats, discovered from ${totalDecks} community decklists. Find your playstyle.`,
      url: 'https://offmeta.app/archetypes',
      type: 'website',
    });
  }, [totalArchetypes, totalDecks, formatData?.length]);

  const activeData = formatData?.find((f) => f.format === activeFormat);

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'OffMeta', item: 'https://offmeta.app/' },
      { '@type': 'ListItem', position: 2, name: 'Archetypes', item: 'https://offmeta.app/archetypes' },
    ],
  };

  return (
    <div className="min-h-screen flex flex-col bg-background relative">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className="fixed inset-0 pointer-events-none bg-page-gradient" aria-hidden="true" />
      <div className="fixed inset-0 pointer-events-none bg-page-noise" aria-hidden="true" />

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
              Deck Archetypes
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
              Archetypes discovered from community decklists across multiple formats.
              Each archetype represents a distinct strategy based on actual deck compositions.
            </p>
            {totalDecks > 0 && (
              <p className="text-xs text-muted-foreground">
                {totalArchetypes} archetypes · {totalDecks.toLocaleString()} community decklists analyzed
              </p>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !formatData || formatData.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-sm text-muted-foreground">No archetype data available yet.</p>
            </div>
          ) : (
            <>
              {/* Format tabs */}
              <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1" role="tablist">
                {formatData.map((fd) => (
                  <button
                    key={fd.format}
                    role="tab"
                    aria-selected={activeFormat === fd.format}
                    onClick={() => setActiveFormat(fd.format)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      activeFormat === fd.format
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    {fd.label}
                    <span className="ml-1.5 text-xs opacity-70">({fd.totalDecks})</span>
                  </button>
                ))}
              </div>

              {/* Archetype grid */}
              {activeData && (
                <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {activeData.archetypes.map((arch) => (
                    <Link
                      key={`${arch.format}-${arch.archetype}`}
                      to={`/archetypes/${arch.archetype}?format=${arch.format}`}
                      className="group rounded-xl border border-border/60 bg-card/50 p-5 hover:bg-card hover:border-border transition-all hover:shadow-sm"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-0.5">
                          {arch.primaryColors.length > 0 ? (
                            arch.primaryColors.map((c) => (
                              <ManaSymbol key={c} symbol={c} size="sm" className="h-4 w-4" />
                            ))
                          ) : (
                            <ManaSymbol symbol="C" size="sm" className="h-4 w-4" />
                          )}
                        </span>
                        <h2 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors flex-1">
                          {formatArchetypeName(arch.archetype)}
                        </h2>
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 h-5 gap-1 font-normal"
                        >
                          <Layers className="h-3 w-3" />
                          {arch.deckCount}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {getArchetypeTagline(arch.archetype)}
                      </p>
                    </Link>
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
