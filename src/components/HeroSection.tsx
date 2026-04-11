/**
 * Hero section — cinematic above-the-fold with animated gradient text and tagline pill.
 */

import { useTranslation } from '@/lib/i18n';
import { HeroCardBackdrop } from '@/components/HeroCardBackdrop';
import { Sparkles } from 'lucide-react';

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <section
      className="relative pt-8 sm:pt-16 lg:pt-20 pb-2 sm:pb-4 overflow-x-hidden"
      aria-labelledby="hero-heading"
    >
      {/* Card art collage */}
      <HeroCardBackdrop />

      {/* Ambient glow blobs */}
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
            AI-Powered MTG Search
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
            'Describe the card you need. OffMeta translates it into a real search instantly.',
          )}
        </p>
      </div>
    </section>
  );
}
