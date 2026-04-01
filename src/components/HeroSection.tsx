/**
 * Hero section — streamlined above-the-fold value prop.
 * Minimal copy so the search bar stays visible without scrolling.
 */

import { useTranslation } from '@/lib/i18n';

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <section
      className="relative pt-6 sm:pt-12 lg:pt-16 pb-1 sm:pb-3 overflow-x-hidden"
      aria-labelledby="hero-heading"
    >
      <div className="container-main text-center relative z-10">
        <h1
          id="hero-heading"
          className="mb-2 sm:mb-3 text-foreground text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-semibold tracking-tight animate-slide-up"
        >
          {t('hero.title', 'Natural language MTG search that generates real')}{' '}
          <span className="text-gradient">
            {t('hero.titleAccent', 'Scryfall queries')}
          </span>
        </h1>

        <p
          className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto animate-slide-up text-center"
          style={{ animationDelay: '80ms' }}
        >
          {t(
            'hero.subtitleCompact',
            `Describe the Magic cards you need in plain English.\nOffMeta translates, shows the query, and lets you refine it before you continue.`,
          )}
        </p>
      </div>
    </section>
  );
}
