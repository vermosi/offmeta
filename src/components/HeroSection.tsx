/**
 * Hero section — compact headline that drives users straight to the search bar.
 */

import { useTranslation } from '@/lib/i18n';
import { Sparkles, Zap, Brain, ChevronDown } from 'lucide-react';

const UNIQUE_BENEFITS = [
  { icon: Brain, labelKey: 'hero.benefitAi' },
  { icon: Zap, labelKey: 'hero.benefitInstant' },
  { icon: Sparkles, labelKey: 'hero.benefitNoSyntax' },
] as const;

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <section
      className="relative pt-5 sm:pt-14 lg:pt-20 pb-2 sm:pb-8 overflow-x-hidden"
      aria-labelledby="hero-heading"
    >

      <div className="container-main text-center relative z-10">
        {/* Pill badge — hidden on mobile */}
        <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-accent/20 bg-accent/5 text-accent text-xs font-medium mb-5 animate-fade-in">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          <span>{t('hero.pillBadge')}</span>
        </div>

        {/* Main headline */}
        <h1
          id="hero-heading"
          className="mb-1.5 sm:mb-4 text-foreground text-2xl sm:text-4xl lg:text-5xl xl:text-6xl font-semibold tracking-tight animate-slide-up"
        >
          {t('hero.title')}{' '}
          <span className="text-gradient">{t('hero.titleAccent')}</span>
        </h1>

        {/* Subtitle — shorter on mobile */}
        <p className="text-xs sm:text-base lg:text-lg text-muted-foreground max-w-lg mx-auto mb-3 sm:mb-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <span className="sm:hidden">{t('hero.subtitleMobile')}</span>
          <span className="hidden sm:inline">
            {t('hero.subtitleDesktop1')}{' '}
            <span className="text-foreground font-medium">{t('hero.subtitleDesktop2')}</span>{' '}
            {t('hero.subtitleDesktop3')}
          </span>
        </p>

        {/* Benefit chips — compact on mobile */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-3 animate-slide-up" style={{ animationDelay: '200ms' }}>
          {UNIQUE_BENEFITS.map(({ icon: Icon, labelKey }) => (
            <div
              key={labelKey}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-secondary/60 border border-border/40 text-[10px] sm:text-xs text-muted-foreground"
            >
              <Icon className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-accent" aria-hidden="true" />
              <span>{t(labelKey)}</span>
            </div>
          ))}
        </div>

        {/* Bounce arrow — mobile only, nudges toward search bar */}
        <div className="sm:hidden flex justify-center mt-3 animate-bounce" aria-hidden="true">
          <ChevronDown className="h-5 w-5 text-accent/60" />
        </div>
      </div>
    </section>
  );
}
