/**
 * Hero section for the landing page.
 * Kept premium and static so search stays the main event.
 */

import { ArrowRight, Compass, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from '@/lib/i18n';

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <section
      className="relative overflow-x-hidden pb-8 pt-10 sm:pb-12 sm:pt-16 lg:pt-20"
      aria-labelledby="hero-heading"
    >
      <div className="container-main relative z-10 text-center">
        <div className="mb-4 flex justify-center sm:mb-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/12 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-accent backdrop-blur-sm">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            {t('hero.taglinePill', 'AI-powered MTG discovery engine')}
          </span>
        </div>

        <h1
          id="hero-heading"
          className="mx-auto mb-4 max-w-5xl text-4xl font-semibold tracking-tight text-foreground sm:text-6xl lg:text-7xl"
        >
          <span className="sr-only">OffMeta - Natural Language MTG Search. </span>
          {t('hero.title', 'Search Magic cards in')}{' '}
          <span className="text-aurora">
            {t('hero.titleAccent', 'plain English')}
          </span>
        </h1>

        <p className="mx-auto max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-lg">
          {t(
            'hero.subtitleCompact',
            'Describe the card, effect, or archetype you want. OffMeta turns it into a real Scryfall search, shows the exact query, and keeps power-user control close at hand.',
          )}
        </p>

        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:mt-8 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              const input = document.getElementById('search-input');
              if (!input) return;
              input.focus();
              input.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/15 transition-transform transition-colors hover:-translate-y-0.5 hover:shadow-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t('hero.ctaPrimary', 'Start searching')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>

          <Link
            to="/archetypes"
            className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border/80 bg-card/60 px-6 text-sm font-semibold text-foreground backdrop-blur-md transition-colors hover:border-accent/40 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Compass
              className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-accent"
              aria-hidden="true"
            />
            {t('hero.ctaSecondary', 'Explore archetypes')}
          </Link>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
          <Link
            to="/docs/syntax"
            className="rounded-full border border-border/70 bg-background/70 px-3 py-1.5 font-medium text-foreground transition-colors hover:border-accent/40 hover:text-accent"
          >
            {t('hero.learnSyntax', 'Learn syntax')}
          </Link>
          <Link
            to="/guides"
            className="rounded-full border border-border/70 bg-background/70 px-3 py-1.5 font-medium text-foreground transition-colors hover:border-accent/40 hover:text-accent"
          >
            {t('hero.browseGuides', 'Browse guides')}
          </Link>
          <Link
            to="/saved"
            className="rounded-full border border-border/70 bg-background/70 px-3 py-1.5 font-medium text-foreground transition-colors hover:border-accent/40 hover:text-accent"
          >
            {t('hero.savedSearches', 'Saved searches')}
          </Link>
        </div>
      </div>
    </section>
  );
}
