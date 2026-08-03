/**
 * Homepage landing page.
 * Explains the product clearly while keeping search front and center.
 */

import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Search,
  SlidersHorizontal,
  Sparkles,
  BookOpen,
  Layers3,
  TrendingUp,
} from 'lucide-react';
import { queryToSlug } from '@/lib/search-slug';
import { applySeoMeta } from '@/lib/seo';

const AuthModal = lazy(() =>
  import('@/components/AuthModal').then((m) => ({ default: m.AuthModal })),
);

export default function LandingPage() {
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    const cleanupSeo = applySeoMeta({
      title: 'Search Magic cards in plain English',
      description:
        'Describe what you want, see the exact Scryfall query, and jump straight to real card results.',
      url: 'https://offmeta.app/',
      type: 'website',
    });

    const win = window as Window & {
      __openAuthModal?: () => void;
    };
    win.__openAuthModal = () => setAuthModalOpen(true);
    return () => {
      delete win.__openAuthModal;
      cleanupSeo();
    };
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const rawQuery = String(formData.get('query') ?? '').trim();
    if (!rawQuery) return;
    window.location.assign(`/search/${queryToSlug(rawQuery)}`);
  };

  return (
    <main className="min-h-screen bg-background">
      <section className="relative overflow-hidden pb-12 pt-10 sm:pb-16 sm:pt-16 lg:pt-20">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-accent/10 via-transparent to-transparent"
          aria-hidden="true"
        />

        <div className="fixed right-4 top-4 z-20 sm:right-6 sm:top-6">
          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="focus-ring rounded-full border border-border/80 bg-card/90 px-4 py-2 text-sm font-medium text-foreground shadow-md backdrop-blur-sm transition-colors hover:bg-card"
          >
            Sign in
          </button>
        </div>

        <div className="container-main relative z-10 text-center">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-medium text-accent backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            AI-powered MTG discovery engine
          </div>

          <h1 className="mx-auto mb-4 max-w-5xl text-4xl font-semibold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Search Magic cards in{' '}
            <span className="text-accent">plain English</span>
          </h1>

          <p className="mx-auto max-w-3xl whitespace-pre-line text-sm leading-relaxed text-muted-foreground sm:text-lg">
            Describe what you want, see the exact Scryfall query, and jump
            straight to real card results.{'\n'}OffMeta helps you search faster
            without giving up control.
          </p>

          <div className="mx-auto mt-6 grid max-w-4xl gap-3 text-left sm:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur-sm">
              <Search className="mb-3 h-5 w-5 text-accent" aria-hidden="true" />
              <h2 className="mb-1 text-sm font-semibold text-foreground">
                Search naturally
              </h2>
              <p className="text-sm text-muted-foreground">
                Type things like "cheap green ramp spells" or "board wipes
                under $5".
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur-sm">
              <SlidersHorizontal
                className="mb-3 h-5 w-5 text-accent"
                aria-hidden="true"
              />
              <h2 className="mb-1 text-sm font-semibold text-foreground">
                See the real query
              </h2>
              <p className="text-sm text-muted-foreground">
                OffMeta shows the query it built so you can edit it yourself.
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur-sm">
              <ArrowRight className="mb-3 h-5 w-5 text-accent" aria-hidden="true" />
              <h2 className="mb-1 text-sm font-semibold text-foreground">
                Go from idea to cards
              </h2>
              <p className="text-sm text-muted-foreground">
                Search, refine, and open card results without memorizing
                operators.
              </p>
            </div>
          </div>

          <p className="mx-auto mt-6 max-w-3xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
            OffMeta is built for players who think in game concepts first and
            filters second. It is fast enough for casual brewing and
            transparent enough for power users.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-8 flex max-w-3xl flex-col gap-3 sm:flex-row"
          >
            <label htmlFor="search-input" className="sr-only">
              Start searching
            </label>
            <input
              id="search-input"
              name="query"
              placeholder="budget board wipes under $5"
              className="min-h-12 flex-1 rounded-full border border-border bg-card px-5 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-ring/30"
            />
            <button
              type="submit"
              data-testid="search-submit-button"
              className="min-h-12 rounded-full bg-accent px-6 text-sm font-medium text-accent-foreground shadow-lg shadow-accent/20 transition-colors hover:shadow-accent/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Start searching
            </button>
          </form>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
            <a className="hover:text-foreground transition-colors" href="/guides">
              Search guides
            </a>
            <span aria-hidden="true">•</span>
            <a className="hover:text-foreground transition-colors" href="/about">
              Why OffMeta
            </a>
            <span aria-hidden="true">•</span>
            <a className="hover:text-foreground transition-colors" href="/docs">
              Read docs
            </a>
          </div>
        </div>
      </section>

      <section className="border-t border-border/40 bg-card/30 px-4 py-12 sm:py-16">
        <div className="container-main">
          <div className="mx-auto max-w-5xl">
            <div className="mb-6 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Built for search intent
              </p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-semibold text-foreground">
                Find the kind of card you mean, not just the words you type.
              </h2>
              <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
                OffMeta is strongest when you know the job a card needs to do.
                Search by tribe, format, budget, keyword, combo piece, or a
                messy sentence like "cheap green ramp that draws a card."
                Then refine the result instead of starting over.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <a
                href="/guides"
                className="rounded-2xl border border-border/60 bg-background/80 p-5 transition-colors hover:border-primary/40 hover:bg-card"
              >
                <BookOpen className="h-5 w-5 text-accent" aria-hidden="true" />
                <h3 className="mt-3 text-base font-semibold text-foreground">
                  Learn faster
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Use progressive guides for tribes, budget searches, format
                  legality, keywords, and complex queries.
                </p>
              </a>

              <a
                href="/combos"
                className="rounded-2xl border border-border/60 bg-background/80 p-5 transition-colors hover:border-primary/40 hover:bg-card"
              >
                <Layers3 className="h-5 w-5 text-accent" aria-hidden="true" />
                <h3 className="mt-3 text-base font-semibold text-foreground">
                  Find combos
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Search for engines, finishers, and synergy loops when you
                  want a shell instead of a single card.
                </p>
              </a>

              <a
                href="/docs"
                className="rounded-2xl border border-border/60 bg-background/80 p-5 transition-colors hover:border-primary/40 hover:bg-card"
              >
                <TrendingUp className="h-5 w-5 text-accent" aria-hidden="true" />
                <h3 className="mt-3 text-base font-semibold text-foreground">
                  Translate intent
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Read syntax examples and search tips when you want to nudge
                  the query yourself.
                </p>
              </a>
            </div>
          </div>
        </div>
      </section>

      {authModalOpen && (
        <Suspense fallback={null}>
          <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
        </Suspense>
      )}
    </main>
  );
}
