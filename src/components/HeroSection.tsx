/**
 * Hero section for the landing page.
 *
 * Editorial masthead → headline → one-line promise. Nothing else: the search
 * bar renders immediately underneath so visitors reach real cards fast.
 */

import { useTranslation } from '@/lib/i18n';

const MANA_DOTS = [
  { key: 'white', className: 'bg-mtg-white' },
  { key: 'blue', className: 'bg-mtg-blue' },
  { key: 'black', className: 'bg-mtg-black' },
  { key: 'red', className: 'bg-mtg-red' },
  { key: 'green', className: 'bg-mtg-green' },
] as const;

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <section
      className="relative overflow-x-hidden pb-4 pt-6 sm:pb-6 sm:pt-10"
      aria-labelledby="hero-heading"
    >
      <div className="container-main relative z-10">
        {/* Masthead strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.34em] text-muted-foreground sm:text-[11px]">
            <span className="flex items-center gap-1.5" aria-hidden="true">
              {MANA_DOTS.map((dot) => (
                <span
                  key={dot.key}
                  className={`h-1.5 w-1.5 rounded-full ${dot.className} opacity-80`}
                />
              ))}
            </span>
            <span className="text-foreground/80">OffMeta</span>
            <span className="text-muted-foreground/50">/</span>
            <span>{t('hero.mastheadIndex', 'Card index')}</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.34em] text-muted-foreground sm:text-[11px]">
            <span
              className="h-1.5 w-1.5 rounded-full bg-success"
              aria-hidden="true"
            />
            {t('hero.mastheadLive', 'Live · Scryfall data')}
          </div>
        </div>

        {/* Headline */}
        <div className="grid gap-6 pt-8 sm:pt-10 lg:grid-cols-12 lg:items-end">
          <h1
            id="hero-heading"
            className="lg:col-span-8 font-display text-[clamp(2.5rem,6.4vw,5rem)] font-extrabold uppercase leading-[0.85] tracking-tight text-foreground"
          >
            <span className="sr-only">
              {t(
                'hero.accessibleTitle',
                'OffMeta. Search Magic cards in plain English.',
              )}{' '}
            </span>
            <span aria-hidden="true">
              {t('hero.titleLine1', 'Manifest the')}
              <br />
              <span className="font-editorial text-[0.94em] font-normal normal-case italic tracking-normal text-accent">
                {t('hero.titleLine2', 'perfect draw.')}
              </span>
            </span>
          </h1>

          <p className="lg:col-span-4 lg:pb-3 max-w-md text-base leading-snug text-muted-foreground sm:text-lg">
            {t(
              'hero.subtitleIntent',
              'Search Magic by intent, not Scryfall syntax.',
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
