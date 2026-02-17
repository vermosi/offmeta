/**
 * Archetype discovery index — grid of curated Commander archetypes.
 */

import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ManaSymbol } from '@/components/ManaSymbol';
import { ARCHETYPES } from '@/data/archetypes';
import { ArrowLeft, Compass } from 'lucide-react';

export default function ArchetypesIndex() {
  return (
    <div className="min-h-screen flex flex-col bg-background relative">
      <div className="fixed inset-0 pointer-events-none bg-page-gradient" aria-hidden="true" />
      <div className="fixed inset-0 pointer-events-none bg-page-noise" aria-hidden="true" />

      <Header />

      <main className="relative flex-1 pt-6 sm:pt-10 pb-16">
        <div className="container-main max-w-4xl">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to search
          </Link>

          <div className="space-y-2 mb-10">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
              <Compass className="h-7 w-7 text-primary" />
              Commander Archetypes
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
              Explore the most popular Commander deck strategies. Each archetype includes a curated card search, key cards, and budget tips.
            </p>
            <p className="text-xs text-muted-foreground">
              {ARCHETYPES.length} archetypes · Click any to explore
            </p>
          </div>

          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ARCHETYPES.map((arch) => (
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
                  <h2 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {arch.name}
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {arch.tagline}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
