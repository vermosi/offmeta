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
          {t('hero.title', 'Search Magic cards in')}{' '}
          <span className="text-gradient">
            {t('hero.titleAccent', 'plain English')}
          </span>
        </h1>

        <p
          className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto animate-slide-up"
          style={{ animationDelay: '80ms' }}
        >
          {t(
            'hero.subtitleCompact',
            'Type what you want — OffMeta translates it into a real Scryfall search instantly.',
          )}
        </p>
      </div>
    </section>
  );
}
