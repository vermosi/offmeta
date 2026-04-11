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
      {/* Subtle radial glow behind hero text */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="container-main text-center relative z-10">
        <h1
          id="hero-heading"
          className="mb-2 sm:mb-3 text-foreground text-2xl sm:text-4xl lg:text-5xl xl:text-6xl font-semibold tracking-tight animate-slide-up"
        >
          {t('hero.title', 'Search Magic cards')}{' '}
          <span className="text-gradient">
            {t('hero.titleAccent', 'in plain English')}
          </span>
        </h1>

        <p
          className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto animate-slide-up text-center"
        >
          {t(
            'hero.subtitleCompact',
            'Describe the card you need. OffMeta translates it into a real search instantly.',
          )}
        </p>
      </div>
    </section>
  );
}
