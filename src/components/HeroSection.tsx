/**
 * Hero section for the landing page.
 * Keeps the presentation premium but static, with no decorative animation
 * stack competing with the search experience.
 */

import { ArrowRight, Compass, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from '@/lib/i18n';

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <section
      className="relative pt-8 sm:pt-16 lg:pt-20 pb-6 sm:pb-8 overflow-x-hidden"
      aria-labelledby="hero-heading"
    >
      <div className="container-main text-center relative z-10">
        <div className="flex justify-center mb-4 sm:mb-6">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium border border-accent/30 bg-accent/10 text-accent backdrop-blur-sm">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            {t('hero.taglinePill', 'AI-powered MTG discovery engine')}
          </span>
        </div>

        <h1
          id="hero-heading"
          className="mb-3 sm:mb-5 text-foreground text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-semibold tracking-tight leading-[1.05]"
        >
          <span className="sr-only">OffMeta — Natural Language MTG Search. </span>
          {t('hero.title', 'Find Magic cards, synergies, and')}{' '}
          <span className="text-accent">
            {t('hero.titleAccent', 'hidden gems in plain English')}
          </span>
        </h1>

        <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto text-center leading-relaxed">
          {t(
            'hero.subtitleCompact',
            'Describe the card, effect, or archetype you want — OffMeta turns plain English into a real Scryfall search and surfaces alternatives, synergies, and hidden gems you would never find with raw syntax.',
          )}
        </p>

        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              const input = document.getElementById('search-input');
              if (!input) return;
              input.focus();
              input.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            className="group inline-flex items-center justify-center gap-2 min-h-11 px-6 rounded-full bg-accent text-accent-foreground font-medium text-sm shadow-lg shadow-accent/20 hover:shadow-accent/35 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t('hero.ctaPrimary', 'Start searching')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>

          <Link
            to="/archetypes"
            className="group inline-flex items-center justify-center gap-2 min-h-11 px-6 rounded-full border border-border/80 bg-card/40 text-foreground font-medium text-sm backdrop-blur-md hover:bg-card/70 hover:border-accent/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Compass
              className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors"
              aria-hidden="true"
            />
            {t('hero.ctaSecondary', 'Explore archetypes')}
          </Link>
        </div>
      </div>
    </section>
  );
}
