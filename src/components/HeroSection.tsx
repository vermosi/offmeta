/**
 * Hero section for the landing page.
 * Kept small so the first screen stays focused on the search action.
 */

import { ArrowRight, Search, Sparkles } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { MTG_COPY } from '@/lib/i18n/copy';

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <section
      className="relative overflow-x-hidden pb-6 pt-8 sm:pb-8 sm:pt-14 lg:pt-18"
      aria-labelledby="hero-heading"
    >
      <div className="container-main relative z-10 text-center">
        <div className="mb-4 flex justify-center sm:mb-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-medium text-accent backdrop-blur-sm">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            {t('hero.taglinePill', 'Plain-English Magic search')}
          </span>
        </div>

        <h1
          id="hero-heading"
          className="mb-3 text-3xl font-semibold tracking-tight leading-[1.05] text-foreground sm:text-5xl lg:text-6xl xl:text-7xl"
        >
          <span className="sr-only">
            OffMeta. Search Magic cards in plain English.{' '}
          </span>
          {t('hero.title', MTG_COPY.heroTitle)}{' '}
          <span className="text-accent">
            {t('hero.titleAccent', 'Scryfall syntax')}
          </span>
        </h1>

        <p className="mx-auto max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-lg">
          {t('hero.subtitleCompact', MTG_COPY.heroSubtitle)}
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
            className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-medium text-accent-foreground shadow-lg shadow-accent/20 transition-colors hover:shadow-accent/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t('hero.ctaPrimary', 'Start searching')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 inline-flex max-w-2xl items-center gap-2 rounded-full border border-border/60 bg-card/50 px-3 py-1.5 text-xs text-muted-foreground">
          <Search className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
          {t('hero.helpText', MTG_COPY.heroHint)}
        </div>
      </div>
    </section>
  );
}
