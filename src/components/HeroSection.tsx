/**
 * Hero section — streamlined above-the-fold value prop with card backdrop.
 */

import { useTranslation } from '@/lib/i18n';
import { HeroCardBackdrop } from '@/components/HeroCardBackdrop';

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <section
      className="relative pt-6 sm:pt-12 lg:pt-16 pb-1 sm:pb-3 overflow-x-hidden"
      aria-labelledby="hero-heading"
    >
      {/* Card art collage — desktop only */}
      <HeroCardBackdrop />

      {/* Ambient glow blobs */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        <div className="glow-orb absolute -top-40 -left-20 opacity-40" />
        <div className="glow-orb glow-orb-secondary absolute -top-20 -right-32 opacity-30" />
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

        <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto animate-slide-up text-center">
          {t(
            'hero.subtitleCompact',
            'Describe the card you need. OffMeta translates it into a real search instantly.',
          )}
        </p>
      </div>
    </section>
  );
}
