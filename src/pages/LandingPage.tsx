/**
 * Homepage landing page.
 * Explains the product clearly while keeping search front and center.
 */

import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import { queryToSlug } from '@/lib/search-slug';

const AuthModal = lazy(() =>
  import('@/components/AuthModal').then((m) => ({ default: m.AuthModal })),
);

export default function LandingPage() {
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    const win = window as Window & {
      __openAuthModal?: () => void;
    };
    win.__openAuthModal = () => setAuthModalOpen(true);
    document.body.style.overflow = '';
    return () => {
      delete win.__openAuthModal;
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
      <section className="relative overflow-visible pb-12 pt-10 sm:pb-16 sm:pt-16 lg:pt-20">
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
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/12 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-accent backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            AI-powered MTG discovery engine
          </div>

          <h1 className="mx-auto mb-4 max-w-4xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Search Magic cards in{' '}
            <span className="text-aurora">plain English</span>
          </h1>

          <p className="mx-auto max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-lg">
            Describe what you want, see the exact Scryfall query, and jump
            straight to real card results. OffMeta helps you search faster
            without giving up control.
          </p>

          <div className="mx-auto mt-6 grid max-w-4xl gap-3 text-left sm:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur-sm">
              <Search className="mb-3 h-5 w-5 text-accent" aria-hidden="true" />
              <h2 className="mb-1 text-sm font-semibold text-foreground">
                Search naturally
              </h2>
              <p className="text-sm text-muted-foreground">
                Type things like "cheap green ramp spells" or "board wipes
                under $5".
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur-sm">
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

            <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur-sm">
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
              className="min-h-12 rounded-full bg-accent px-6 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/15 transition-transform transition-colors hover:-translate-y-0.5 hover:shadow-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Start searching
            </button>
          </form>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
            <a
              className="hover:text-foreground transition-colors"
              href="/archetypes"
            >
              Explore archetypes
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

      {authModalOpen && (
        <Suspense fallback={null}>
          <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
        </Suspense>
      )}
    </main>
  );
}
