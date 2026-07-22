/**
 * Hero section for the landing page.
 *
 * Editorial, awwwards-style spatial-grid treatment: masked grid + orb
 * ambience behind an oversized headline with a gradient accent phrase.
 * Purely presentational — the actual search bar lives in the page shell
 * beneath this hero, and its halo is applied there via `.search-halo`.
 */

import { ArrowRight, Compass, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from '@/lib/i18n';

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <section
      className="bg-spatial-grid relative pt-10 sm:pt-20 lg:pt-24 pb-8 sm:pb-12 overflow-x-hidden"
      aria-labelledby="hero-heading"
    >
      <div className="container-main text-center">
        <div className="flex justify-center mb-5 sm:mb-7">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-medium border border-accent/30 bg-accent/10 text-accent backdrop-blur-sm">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            {t('hero.taglinePill', 'AI-powered MTG discovery engine')}
          </span>
        </div>

        <h1
          id="hero-heading"
          className="mb-4 sm:mb-6 text-foreground text-4xl sm:text-6xl lg:text-7xl xl:text-[5.25rem] font-semibold tracking-tighter leading-[1.02]"
        >
          
          {t('hero.title', 'Find the card,')}
          <br className="hidden sm:block" />{' '}
          <span className="text-aurora font-bold">
            {t('hero.titleAccent', 'forget the syntax.')}
          </span>
        </h1>

        <p className="text-sm sm:text-lg text-muted-foreground max-w-xl mx-auto text-center leading-relaxed whitespace-pre-line">
          {t(
            'hero.subtitleCompact',
            'Search Magic: The Gathering cards using natural language.\nNo more regex, no more cryptic operators.',
          )}
        </p>

        <div className="mt-7 sm:mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              const input = document.getElementById('search-input');
              if (!input) return;
              input.focus();
              input.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            className="group inline-flex items-center justify-center gap-2 min-h-11 px-6 rounded-full bg-accent text-accent-foreground font-medium text-sm shadow-lg shadow-accent/25 hover:shadow-accent/40 transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t('hero.ctaPrimary', 'Start searching')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
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
