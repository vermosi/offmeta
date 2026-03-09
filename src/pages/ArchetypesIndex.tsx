/**
 * Archetype discovery index — grid of curated Commander archetypes
 * with live deck counts from community_decks.
 */

import { useEffect } from 'react';
import { applySeoMeta } from '@/lib/seo';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ManaSymbol } from '@/components/ManaSymbol';
import { Badge } from '@/components/ui/badge';
import { ARCHETYPES } from '@/data/archetypes';
import { useArchetypeDeckCounts } from '@/hooks/useArchetypeDeckCounts';
import { ArrowLeft, Compass, Layers } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { SkipLinks } from '@/components/SkipLinks';


export default function ArchetypesIndex() {
  const { t } = useTranslation();
  const { data: deckCounts, isLoading: countsLoading } = useArchetypeDeckCounts();

  useEffect(() => {
    return applySeoMeta({
      title: 'Commander Archetypes — Voltron, Aristocrats, Tokens & More | OffMeta',
      description: `Explore ${ARCHETYPES.length} Commander archetypes with strategy guides, key cards, budget tips, and pre-built searches. Find your playstyle for EDH.`,
      url: 'https://offmeta.app/archetypes',
      type: 'website',
    });
  }, []);

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'OffMeta', item: 'https://offmeta.app/' },
      { '@type': 'ListItem', position: 2, name: 'Archetypes', item: 'https://offmeta.app/archetypes' },
    ],
  };

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Commander Archetypes',
    description: `Explore ${ARCHETYPES.length} Commander archetypes with strategy guides and key cards.`,
    url: 'https://offmeta.app/archetypes',
    publisher: { '@type': 'Organization', name: 'OffMeta' },
  };

  /** Resolve deck count for an archetype slug (case-insensitive match) */
  const getDeckCount = (slug: string, name: string): number | undefined => {
    if (!deckCounts) return undefined;
    // Try slug first, then lowercase name
    return deckCounts.get(slug) ?? deckCounts.get(name.toLowerCase()) ?? undefined;
  };

  // Sort: archetypes with deck counts first (by count desc), then alphabetical
  const sortedArchetypes = [...ARCHETYPES].sort((a, b) => {
    const countA = getDeckCount(a.slug, a.name) ?? 0;
    const countB = getDeckCount(b.slug, b.name) ?? 0;
    if (countA !== countB) return countB - countA;
    return a.name.localeCompare(b.name);
  });

  const totalDecks = deckCounts
    ? Array.from(deckCounts.values()).reduce((sum, c) => sum + c, 0)
    : 0;

  return (
    <div className="min-h-screen flex flex-col bg-background relative">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />

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

          <div className="space-y-2 mb-10">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
              <Compass className="h-7 w-7 text-primary" />
              {t('archetypes.title')}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
              {t('archetypes.subtitle')}
            </p>
            <p className="text-xs text-muted-foreground">
              {ARCHETYPES.length} {t('archetypes.count')}
              {totalDecks > 0 && (
                <span className="ml-2 text-muted-foreground/70">
                  · {totalDecks.toLocaleString()} community decklists tracked
                </span>
              )}
            </p>
          </div>

          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sortedArchetypes.map((arch) => {
              const count = getDeckCount(arch.slug, arch.name);

              return (
                <Link
                  key={arch.slug}
                  to={`/archetypes/${arch.slug}`}
                  className="group rounded-xl border border-border/60 bg-card/50 p-5 hover:bg-card hover:border-border transition-all hover:shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-0.5">
                      {arch.colors.map((c) => (
                        <ManaSymbol key={c} symbol={c} size="sm" className="h-4 w-4" />
                      ))}
                    </span>
                    <h2 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors flex-1">
                      {arch.name}
                    </h2>
                    {count !== undefined && count > 0 && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 h-5 gap-1 font-normal"
                      >
                        <Layers className="h-3 w-3" />
                        {count.toLocaleString()}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {arch.tagline}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}