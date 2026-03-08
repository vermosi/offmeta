/**
 * Hero section — immersive magical gateway that hooks users instantly.
 * Features animated floating mana orbs, typewriter cycling tagline,
 * and playful copy that differentiates OffMeta from raw Scryfall.
 */

import { useMemo } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useTypewriterCycle } from '@/hooks/useTypewriterCycle';
import { Sparkles, Zap, Brain } from 'lucide-react';

const HERO_PHRASES = [
  'creatures that make treasure tokens',
  'board wipes under $5',
  'legendary dragons with flying',
  'sacrifice outlets in Rakdos',
  'cantrips for storm decks',
] as const;

const UNIQUE_BENEFITS = [
  { icon: Brain, label: 'AI-powered translation' },
  { icon: Zap, label: 'Instant Scryfall results' },
  { icon: Sparkles, label: 'No syntax needed' },
] as const;

export function HeroSection() {
  const { t } = useTranslation();
  const typedPhrase = useTypewriterCycle(HERO_PHRASES);

  return (
    <section
      className="relative pt-8 sm:pt-14 lg:pt-20 pb-4 sm:pb-8 overflow-hidden"
      aria-labelledby="hero-heading"
    >
      {/* Floating mana orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="glow-orb absolute -top-40 left-1/4 opacity-60" />
        <div className="glow-orb glow-orb-secondary absolute -bottom-32 right-1/4 opacity-50" />
        <div className="glow-orb absolute top-20 right-10 w-[300px] h-[300px] opacity-30" style={{ animationDelay: '-2s' }} />
      </div>

      <div className="container-main text-center relative z-10">
        {/* Pill badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-accent/20 bg-accent/5 text-accent text-xs font-medium mb-5 animate-fade-in">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          <span>Search Magic cards like a human, not a robot</span>
        </div>

        {/* Main headline */}
        <h1
          id="hero-heading"
          className="mb-3 sm:mb-4 text-foreground text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-semibold tracking-tight animate-slide-up"
        >
          {t('hero.title')}{' '}
          <span className="text-gradient">{t('hero.titleAccent')}</span>
        </h1>

        {/* Subtitle with personality */}
        <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-lg mx-auto mb-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
          Forget cryptic Scryfall syntax. Just{' '}
          <span className="text-foreground font-medium">describe what you need</span>{' '}
          and we'll find it — instantly.
        </p>

        {/* Typewriter demo */}
        <div
          className="mx-auto max-w-md mb-6 animate-slide-up"
          style={{ animationDelay: '200ms' }}
          aria-hidden="true"
        >
          <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm px-4 py-3 text-sm text-muted-foreground font-mono flex items-center gap-2">
            <span className="text-accent">→</span>
            <span className="truncate">
              {typedPhrase}
              <span className="inline-block w-[2px] h-4 bg-accent/70 ml-0.5 align-middle animate-pulse" />
            </span>
          </div>
        </div>

        {/* Unique benefit chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 animate-slide-up" style={{ animationDelay: '300ms' }}>
          {UNIQUE_BENEFITS.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/60 border border-border/40 text-xs text-muted-foreground"
            >
              <Icon className="h-3 w-3 text-accent" aria-hidden="true" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
