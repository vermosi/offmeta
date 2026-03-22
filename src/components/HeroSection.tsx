/**
 * Hero section — clearer homepage value prop focused on plain-English MTG search.
 */

import { useTranslation } from '@/lib/i18n';
import { Sparkles, Zap, Brain, ChevronDown } from 'lucide-react';

const UNIQUE_BENEFITS = [
  {
    icon: Brain,
    labelKey: 'hero.benefitPlainEnglish',
    fallback: 'Plain-English MTG search',
  },
  {
    icon: Sparkles,
    labelKey: 'hero.benefitNoSyntax',
    fallback: 'No Scryfall syntax needed',
  },
  {
    icon: Zap,
    labelKey: 'hero.benefitInstant',
    fallback: 'Instant translated results',
  },
] as const;

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <section
      className="relative pt-5 sm:pt-14 lg:pt-20 pb-2 sm:pb-6 overflow-x-hidden"
      aria-labelledby="hero-heading"
    >
      <div className="container-main text-center relative z-10">
        <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-accent/20 bg-accent/5 text-accent text-xs font-medium mb-5 animate-fade-in">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          <span>
            {t(
              'hero.pillBadge',
              'OffMeta translates plain-English MTG searches into Scryfall-ready results',
            )}
          </span>
        </div>

        <h1
          id="hero-heading"
          className="mb-2 sm:mb-4 text-foreground text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-semibold tracking-tight animate-slide-up"
        >
          {t('hero.title', 'Search Magic cards in')}{' '}
          <span className="text-gradient">
            {t('hero.titleAccent', 'plain English')}
          </span>
        </h1>

        <p
          className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto mb-3 sm:mb-5 animate-slide-up"
          style={{ animationDelay: '100ms' }}
        >
          <span className="sm:hidden">
            {t(
              'hero.subtitleMobile',
              'For Commander players, brewers, and deckbuilders who want useful MTG results without learning Scryfall syntax.',
            )}
          </span>
          <span className="hidden sm:inline">
            {t(
              'hero.subtitleDesktop1',
              'OffMeta is for Commander players, brewers, and deckbuilders who want to',
            )}{' '}
            <span className="text-foreground font-medium">
              {t('hero.subtitleDesktop2', 'search MTG cards in plain English')}
            </span>{' '}
            {t(
              'hero.subtitleDesktop3',
              'and get instant translated results without learning Scryfall syntax.',
            )}
          </span>
        </p>

        <div
          className="mx-auto max-w-3xl rounded-2xl border border-border/60 bg-card/60 px-4 py-3 sm:px-5 sm:py-4 text-left animate-slide-up"
          style={{ animationDelay: '150ms' }}
        >
          <p className="text-sm sm:text-base text-foreground font-medium">
            {t(
              'hero.supportCopy',
              'Type what you want, like “budget board wipes under $5” or “cards that protect my commander,” and OffMeta turns it into a real card search instantly.',
            )}
          </p>
        </div>

        <div
          className="mt-3 flex items-center justify-center gap-1.5 sm:gap-3 flex-wrap animate-slide-up"
          style={{ animationDelay: '200ms' }}
        >
          {UNIQUE_BENEFITS.map(({ icon: Icon, labelKey, fallback }) => (
            <div
              key={labelKey}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-secondary/60 border border-border/40 text-[10px] sm:text-xs text-muted-foreground"
            >
              <Icon
                className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-accent"
                aria-hidden="true"
              />
              <span>{t(labelKey, fallback)}</span>
            </div>
          ))}
        </div>

        <div
          className="sm:hidden flex justify-center mt-3 animate-bounce"
          aria-hidden="true"
        >
          <ChevronDown className="h-5 w-5 text-accent/60" />
        </div>
      </div>
    </section>
  );
}
