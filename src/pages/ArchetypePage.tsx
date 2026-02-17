/**
 * Individual archetype page with description, auto-run search, key cards, and budget tips.
 */

import { useParams, Link, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ManaSymbol } from '@/components/ManaSymbol';
import { ARCHETYPES } from '@/data/archetypes';
import { ArrowLeft, Compass, Lightbulb, Star, DollarSign, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCallback } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function ArchetypePage() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const archetype = ARCHETYPES.find((a) => a.slug === slug);

  const handleSearch = useCallback(
    (query: string) => {
      navigate(`/?q=${encodeURIComponent(query)}`);
    },
    [navigate],
  );

  if (!archetype) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <h1 className="text-lg font-semibold text-foreground">{t('archetypes.notFound')}</h1>
            <Link to="/archetypes" className="text-sm text-primary hover:underline">
              {t('archetypes.browseAll')}
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Related archetypes: same color overlap
  const related = ARCHETYPES.filter(
    (a) =>
      a.slug !== archetype.slug &&
      a.colors.some((c) => archetype.colors.includes(c)),
  ).slice(0, 4);

  return (
    <div className="min-h-screen flex flex-col bg-background relative">
      <div className="fixed inset-0 pointer-events-none bg-page-gradient" aria-hidden="true" />
      <div className="fixed inset-0 pointer-events-none bg-page-noise" aria-hidden="true" />

      <Header />

      <main className="relative flex-1 pt-6 sm:pt-10 pb-16">
        <div className="container-main max-w-3xl">
          <Link
            to="/archetypes"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('archetypes.allArchetypes')}
          </Link>

          {/* Header */}
          <div className="space-y-3 mb-8">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1">
                {archetype.colors.map((c) => (
                  <ManaSymbol key={c} symbol={c} size="sm" className="h-5 w-5" />
                ))}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">{archetype.name}</h1>
            </div>
            <p className="text-sm text-muted-foreground italic">{archetype.tagline}</p>
          </div>

          {/* Strategy overview */}
          <section className="rounded-xl border border-border/50 bg-card/50 p-5 sm:p-6 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Compass className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">{t('archetypes.strategyOverview')}</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {archetype.description}
            </p>
          </section>

          {/* Search CTA */}
          <section className="rounded-xl border border-primary/20 bg-primary/5 p-5 sm:p-6 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Search className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                {t('archetypes.findCards').replace('{name}', archetype.name)}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {t('archetypes.preBuiltQuery')}
            </p>
            <div className="rounded-lg bg-muted/50 border border-border/50 px-4 py-2.5 mb-4">
              <code className="text-xs text-foreground break-all">{archetype.searchQuery}</code>
            </div>
            <Button
              onClick={() => handleSearch(archetype.searchQuery)}
              className="gap-2"
              size="sm"
            >
              <Search className="h-3.5 w-3.5" />
              {t('archetypes.searchCards')}
            </Button>
          </section>

          {/* Key cards */}
          <section className="rounded-xl border border-border/50 bg-card/50 p-5 sm:p-6 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Star className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-foreground">{t('archetypes.keyCards')}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {archetype.keyCards.map((card) => (
                <button
                  key={card}
                  onClick={() => handleSearch(card)}
                  className="inline-flex items-center px-3 py-1.5 rounded-full border border-border/60 bg-muted/30 text-xs font-medium text-foreground hover:bg-muted/60 hover:border-border transition-colors"
                  title={`Search for ${card}`}
                >
                  {card}
                </button>
              ))}
            </div>
          </section>

          {/* Budget tips */}
          <section className="rounded-xl border border-border/50 bg-card/50 p-5 sm:p-6 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-4 w-4 text-green-500" />
              <h2 className="text-sm font-semibold text-foreground">{t('archetypes.budgetAlternatives')}</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {archetype.budgetTip}
            </p>
          </section>

          {/* Related archetypes */}
          {related.length > 0 && (
            <section className="rounded-xl border border-border/50 bg-card/50 p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">{t('archetypes.relatedArchetypes')}</h2>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    to={`/archetypes/${r.slug}`}
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
