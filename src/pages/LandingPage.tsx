/**
 * Lightweight landing page for the homepage route.
 * Uses only plain markup and a simple form so the root route stays lean.
 */

import type { FormEvent } from 'react';
import { queryToSlug } from '@/lib/search-slug';

export default function LandingPage() {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const rawQuery = String(formData.get('query') ?? '').trim();
    if (!rawQuery) return;
    window.location.assign(`/search/${queryToSlug(rawQuery)}`);
  };

  return (
    <main className="min-h-screen bg-background">
      <section className="relative overflow-hidden pb-16 pt-10 sm:pb-24 sm:pt-16 lg:pt-20">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-accent/10 via-transparent to-transparent"
          aria-hidden="true"
        />
        <div className="container-main relative z-10 text-center">
          <div className="mx-auto mb-4 inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-medium text-accent backdrop-blur-sm">
            AI-powered MTG discovery engine
          </div>

          <h1 className="mx-auto mb-4 max-w-4xl text-4xl font-semibold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Search Magic cards in{' '}
            <span className="text-accent">plain English</span>
          </h1>

          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-lg">
            Describe the card you need. OffMeta turns intent into a real
            Scryfall search instantly, without syntax or guesswork.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row"
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
              className="min-h-12 rounded-full bg-accent px-6 text-sm font-medium text-accent-foreground shadow-lg shadow-accent/20 transition-colors hover:shadow-accent/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Start searching
            </button>
          </form>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
            <a className="hover:text-foreground transition-colors" href="/archetypes">
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
    </main>
  );
}
