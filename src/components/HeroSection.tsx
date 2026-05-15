/**
 * Hero section — cinematic above-the-fold for the Midnight Arcane direction.
 * Tagline pill, animated gradient headline, dual CTAs, and ambient backdrop.
 */

import { useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import { HeroCardBackdrop } from '@/components/HeroCardBackdrop';
import { Sparkles, ArrowRight, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAnalytics } from '@/hooks';

export function HeroSection() {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();

  const focusSearch = useCallback(() => {
    const input = document.getElementById('search-input');
    if (!input) return;
    input.focus();
    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    trackEvent('hero_cta_clicked', { cta: 'start_searching' });
  }, [trackEvent]);

  const handleArchetypesClick = useCallback(() => {
    trackEvent('hero_cta_clicked', { cta: 'explore_archetypes' });
  }, [trackEvent]);

  return (
    <section
      className="relative pt-8 sm:pt-16 lg:pt-20 pb-2 sm:pb-4 overflow-x-hidden"
      aria-labelledby="hero-heading"
    >
      {/* Card art collage */}
      <HeroCardBackdrop />

      {/* Ambient violet/cyan glow */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        <div className="glow-orb absolute -top-40 -left-20 opacity-50" />
        <div className="glow-orb glow-orb-secondary absolute -top-20 -right-32 opacity-40" />
        <div className="glow-orb absolute bottom-0 left-1/3 opacity-20 w-[800px] h-[800px]" />
      </div>

      <div className="container-main text-center relative z-10">
        {/* Tagline pill */}
        <div className="flex justify-center mb-4 sm:mb-6 animate-fade-in">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium border border-accent/30 bg-accent/10 text-accent backdrop-blur-sm">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            {t('hero.taglinePill', 'AI-powered MTG discovery engine')}
          </span>
        </div>

        <h1
          id="hero-heading"
          className="mb-3 sm:mb-5 text-foreground text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-semibold tracking-tight animate-slide-up leading-[1.05]"
        >
          {t('hero.title', 'Search Magic cards')}{' '}
          <span className="text-gradient-animated">
            {t('hero.titleAccent', 'in plain English')}
          </span>
        </h1>

        <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto animate-slide-up text-center leading-relaxed">
          {t(
            'hero.subtitleCompact',
            'Describe the card you need. OffMeta translates intent into a real Scryfall search — instantly, transparently, and without the syntax.',
          )}
        </p>

        {/* Dual CTAs */}
        <div
          className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 animate-slide-up"
          style={{ animationDelay: '120ms' }}
        >
          <button
            type="button"
            onClick={focusSearch}
            className="group inline-flex items-center justify-center gap-2 min-h-11 px-6 rounded-full bg-accent text-accent-foreground font-medium text-sm shadow-lg shadow-accent/20 hover:shadow-accent/40 hover:scale-[1.02] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t('hero.ctaPrimary', 'Start searching')}
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </button>

          <Link
            to="/archetypes"
            onClick={handleArchetypesClick}
            className="group inline-flex items-center justify-center gap-2 min-h-11 px-6 rounded-full border border-border/80 bg-card/40 text-foreground font-medium text-sm backdrop-blur-md hover:bg-card/70 hover:border-accent/40 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
