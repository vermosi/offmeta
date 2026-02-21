/**
 * Hero section — ultra-minimal to get users searching within 3 seconds.
 */

import { useTranslation } from '@/lib/i18n';

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <section
      className="pt-4 sm:pt-8 pb-0"
      aria-labelledby="hero-heading"
    >
      <div className="container-main text-center">
        <h1
          id="hero-heading"
          className="mb-1.5 sm:mb-2 text-foreground text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight"
        >
          {t('hero.title')}{' '}
          <span className="text-gradient">{t('hero.titleAccent')}</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
          {t('hero.subtitle')}
        </p>
      </div>
    </section>
  );
}
