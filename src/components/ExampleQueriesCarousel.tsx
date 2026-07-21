/**
 * ExampleQueriesCarousel — a horizontally scrollable carousel of example
 * queries grouped by the three "How it works" steps (Ask → Translate → Browse).
 * Each example runs a search with one click.
 *
 * Keyboard support:
 *  - Tabs (WAI-ARIA tabs pattern): ←/→ move between tabs, Home/End jump to
 *    first/last, roving tabindex so only the active tab is in the tab order.
 *  - Chips: standard Tab navigation; Enter/Space activates via native <button>.
 *    Chip scrolled into view on focus so keyboard users see the focus ring.
 */
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { MessageSquare, Sparkles, LayoutGrid, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import { useAnalytics } from '@/hooks/useAnalytics';

interface ExampleQueriesCarouselProps {
  onTrySearch: (query: string) => void;
}

type StepKey = 'ask' | 'translate' | 'browse';

export function ExampleQueriesCarousel({
  onTrySearch,
}: ExampleQueriesCarouselProps) {
  const { t } = useTranslation();
  const { trackExampleQueryImpression, trackExampleQueryClick } = useAnalytics();
  const [activeStep, setActiveStep] = useState<StepKey>('ask');

  const tabRefs = useRef<Record<StepKey, HTMLButtonElement | null>>({
    ask: null,
    translate: null,
    browse: null,
  });
  const reactId = useId();

  const steps: Array<{
    key: StepKey;
    icon: typeof MessageSquare;
    label: string;
    hint: string;
    examples: string[];
  }> = [
    {
      key: 'ask',
      icon: MessageSquare,
      label: t('examples.step1Label', 'Ask'),
      hint: t(
        'examples.step1Hint',
        'Describe what you want in plain English.',
      ),
      examples: [
        'cheap red treasure cards',
        'budget alternatives to Rhystic Study',
        'commander legal tutors under $10',
        'mono black sacrifice outlets',
        'artifacts that tap for blue mana',
      ],
    },
    {
      key: 'translate',
      icon: Sparkles,
      label: t('examples.step2Label', 'Translate'),
      hint: t(
        'examples.step2Hint',
        'See how slang and concepts compile to Scryfall syntax.',
      ),
      examples: [
        'ramp spells in green',
        'ETB creatures under 3 mana',
        'wheel effects for commander',
        'stax pieces in white',
        'removal that exiles',
      ],
    },
    {
      key: 'browse',
      icon: LayoutGrid,
      label: t('examples.step3Label', 'Browse'),
      hint: t(
        'examples.step3Hint',
        'Explore archetypes and jump to similar cards.',
      ),
      examples: [
        'cards like Smothering Tithe',
        'aristocrats payoffs',
        'blink commanders',
        'landfall creatures',
        'graveyard recursion for edh',
      ],
    },
  ];

  const active = steps.find((s) => s.key === activeStep) ?? steps[0];
  const trySearchLabel = t('examples.trySearchLabel', 'Try search:');

  const focusTab = useCallback((key: StepKey) => {
    setActiveStep(key);
    // Defer focus so React commits the tabindex change first.
    requestAnimationFrame(() => {
      tabRefs.current[key]?.focus();
    });
  }, []);

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const currentIndex = steps.findIndex((s) => s.key === activeStep);
    if (currentIndex < 0) return;
    let nextIndex: number | null = null;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = (currentIndex + 1) % steps.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = (currentIndex - 1 + steps.length) % steps.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = steps.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    focusTab(steps[nextIndex].key);
  };

  return (
    <section
      className="container-main pb-8 sm:pb-12"
      aria-label={t('examples.sectionLabel', 'Try an example query')}
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex flex-col items-center gap-2 text-center">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t('examples.eyebrow', 'Try it now')}
          </span>
          <h3 className="text-base font-semibold text-foreground sm:text-lg">
            {t(
              'examples.heading',
              'One-click examples for each step',
            )}
          </h3>
        </div>

        {/* Step tabs */}
        <div
          className="mb-4 flex items-center justify-center gap-1.5 sm:gap-2"
          role="tablist"
          aria-label={t('examples.tabsLabel', 'Example categories')}
          aria-orientation="horizontal"
        >
          {steps.map(({ key, icon: Icon, label }) => {
            const isActive = key === activeStep;
            const tabId = `${reactId}-tab-${key}`;
            const panelId = `${reactId}-panel-${key}`;
            return (
              <button
                key={key}
                ref={(el) => {
                  tabRefs.current[key] = el;
                }}
                type="button"
                role="tab"
                id={tabId}
                aria-selected={isActive}
                aria-controls={panelId}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveStep(key)}
                onKeyDown={handleTabKeyDown}
                className={cn(
                  'flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </div>

        <p className="mb-3 text-center text-xs text-muted-foreground" id={`${reactId}-hint`}>
          {active.hint}
        </p>

        {/* Carousel */}
        <div className="relative">
          <div
            className="flex gap-2 overflow-x-auto scroll-smooth pb-2 sm:gap-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tabpanel"
            id={`${reactId}-panel-${active.key}`}
            aria-labelledby={`${reactId}-tab-${active.key}`}
            aria-describedby={`${reactId}-hint`}
          >
            {active.examples.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => onTrySearch(example)}
                onFocus={(e) => {
                  e.currentTarget.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'nearest',
                  });
                }}
                aria-label={`${trySearchLabel} ${example}`}
                className={cn(
                  'group flex min-h-9 shrink-0 items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-2 text-xs font-medium text-foreground backdrop-blur-sm transition-all sm:text-sm',
                  'hover:-translate-y-0.5 hover:border-primary/50 hover:bg-card hover:shadow-md hover:shadow-primary/10',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                )}
              >
                <span className="max-w-[220px] truncate sm:max-w-none">
                  {example}
                </span>
                <ArrowRight
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
          {/* Right fade to hint scrollability */}
          <div
            className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-background to-transparent"
            aria-hidden="true"
          />
        </div>
      </div>
    </section>
  );
}
