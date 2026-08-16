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
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { MessageSquare, Sparkles, LayoutGrid, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/core/utils';
import { useAnalytics } from '@/hooks/useAnalytics';
import { usePrefersReducedMotion } from '@/hooks';

interface ExampleQueriesCarouselProps {
  onTrySearch: (query: string) => void;
}

type StepKey = 'ask' | 'translate' | 'browse';

export function ExampleQueriesCarousel({
  onTrySearch,
}: ExampleQueriesCarouselProps) {
  const { t } = useTranslation();
  const { trackExampleQueryImpression, trackExampleQueryClick } =
    useAnalytics();
  const prefersReducedMotion = usePrefersReducedMotion();
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
        'Start with the card, effect, price, or format you need.',
      ),
      examples: [
        t('examples.ask1', 'budget board wipes under $5'),
        t('examples.ask2', 'budget alternatives to Rhystic Study'),
        t(
          'examples.ask3',
          'creatures that reward opponents attacking each other',
        ),
        t('examples.ask4', 'mono-white card draw for Commander'),
        t('examples.ask5', 'cards similar to Seedborn Muse'),
      ],
    },
    {
      key: 'translate',
      icon: Sparkles,
      label: t('examples.step2Label', 'Translate'),
      hint: t(
        'examples.step2Hint',
        'See the kind of Scryfall query OffMeta builds behind the scenes.',
      ),
      examples: [
        t('examples.translate1', 'hidden finishers under five dollars'),
        t('examples.translate2', 'blue creatures that untap artifacts'),
        t(
          'examples.translate3',
          'graveyard hate that does not exile my own cards',
        ),
        t('examples.translate4', 'cards that punish Treasure decks'),
        t('examples.translate5', 'mono-white card draw that is not a staple'),
      ],
    },
    {
      key: 'browse',
      icon: LayoutGrid,
      label: t('examples.step3Label', 'Browse'),
      hint: t(
        'examples.step3Hint',
        'Use search results to refine, compare, or keep browsing.',
      ),
      examples: [
        t('examples.browse1', 'cards like Smothering Tithe'),
        t('examples.browse2', 'budget alternatives to Rhystic Study'),
        t('examples.browse3', 'creatures that make Treasure when they attack'),
        t('examples.browse4', 'hidden finishers under five dollars'),
        t('examples.browse5', 'cards similar to Seedborn Muse'),
      ],
    },
  ];

  const active = steps.find((s) => s.key === activeStep) ?? steps[0];
  const trySearchLabel = t('examples.trySearchLabel', 'Try search:');

  // Fire an impression event whenever a category (tab) becomes active. Guarded
  // by a sessionStorage set so the same category-per-session emits once.
  useEffect(() => {
    try {
      const key = 'offmeta_hiw_examples_seen';
      const raw = sessionStorage.getItem(key);
      const seen: string[] = raw ? JSON.parse(raw) : [];
      if (seen.includes(active.key)) return;
      seen.push(active.key);
      sessionStorage.setItem(key, JSON.stringify(seen));
    } catch {
      /* fall through; still track */
    }
    trackExampleQueryImpression({
      query: active.key,
      category: active.key,
      visible_count: active.examples.length,
    });
  }, [active.key, active.examples.length, trackExampleQueryImpression]);

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
    let nextIndex: number;
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
      className="container-main border-t border-border/50 py-8 sm:py-12"
      aria-label={t('examples.sectionLabel', 'Try an example query')}
    >
      <div>
        <div className="mb-5 flex flex-col gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.34em] text-muted-foreground">
            {t('examples.eyebrow', 'Try it now')}
          </span>
          <h2 className="font-display text-xl font-extrabold uppercase tracking-tight text-foreground sm:text-2xl">
            {t('examples.heading', 'One-click examples for each step')}
          </h2>
        </div>

        {/* Step tabs */}
        <div
          className="mb-4 flex items-center gap-5"
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
                  'flex min-h-9 items-center gap-1.5 border-b px-1 pb-1 font-mono text-[11px] uppercase tracking-[0.24em] transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </div>

        <p
          className="mb-3 text-xs text-muted-foreground"
          id={`${reactId}-hint`}
        >
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
            {active.examples.map((example, index) => (
              <button
                key={example}
                type="button"
                onClick={() => {
                  trackExampleQueryClick({
                    query: example,
                    category: active.key,
                    position: index,
                    visible_count: active.examples.length,
                  });
                  onTrySearch(example);
                }}

                onFocus={(e) => {
                  e.currentTarget.scrollIntoView({
                    behavior: prefersReducedMotion ? 'auto' : 'smooth',
                    block: 'nearest',
                    inline: 'nearest',
                  });
                }}
                aria-label={`${trySearchLabel} ${example}`}
                className={cn(
                  'group flex min-h-11 shrink-0 items-center gap-2 px-2 py-2 font-mono text-[11px] lowercase tracking-[0.06em] text-muted-foreground underline decoration-border underline-offset-[6px] transition-colors',
                  'hover:text-foreground hover:decoration-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
