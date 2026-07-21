/**
 * "How It Works" — horizontal timeline with animated gradient connectors.
 * Mobile: vertical timeline with gradient line on left.
 * @module components/HowItWorksSection
 */

import { Fragment, useEffect, useRef } from 'react';
import { MessageSquare, Sparkles, LayoutGrid } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { trackEventDirect } from '@/hooks/useAnalytics';

const SEEN_STEPS_KEY = 'offmeta_how_it_works_seen_steps';

function markStepSeen(step: string): boolean {
  try {
    const raw = sessionStorage.getItem(SEEN_STEPS_KEY);
    const seen: string[] = raw ? JSON.parse(raw) : [];
    if (seen.includes(step)) return false;
    seen.push(step);
    sessionStorage.setItem(SEEN_STEPS_KEY, JSON.stringify(seen));
    return true;
  } catch {
    return false;
  }
}

export function HowItWorksSection() {
  const { t } = useTranslation();
  const stepRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.5) continue;
          const step = (entry.target as HTMLElement).dataset.stepNumber;
          if (!step) continue;
          if (!markStepSeen(step)) {
            observer.unobserve(entry.target);
            continue;
          }
          trackEventDirect('how_it_works_step_view', {
            step_number: Number(step),
            viewport: window.innerWidth < 640 ? 'mobile' : 'desktop',
          });
          observer.unobserve(entry.target);
        }
      },
      { threshold: [0.5] },
    );
    for (const el of stepRefs.current) {
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const STEPS = [
    {
      icon: MessageSquare,
      number: '1',
      title: t('howItWorks.step1Title', 'Ask in plain English'),
      detail: t(
        'howItWorks.step1Detail',
        'Describe what you want — e.g. "budget alternatives to Rhystic Study" or "cards that punish treasure decks."',
      ),
    },
    {
      icon: Sparkles,
      number: '2',
      title: t('howItWorks.step2Title', 'We translate it — and show our work'),
      detail: t(
        'howItWorks.step2Detail',
        'OffMeta builds the exact Scryfall query, shows it above the results, and lets you tweak it if you want to.',
      ),
    },
    {
      icon: LayoutGrid,
      number: '3',
      title: t('howItWorks.step3Title', 'Browse results and discover more'),
      detail: t(
        'howItWorks.step3Detail',
        'Get real cards from Scryfall, then jump to similar cards, budget alternatives, or related archetypes.',
      ),
    },
  ] as const;

  const headingId = 'how-it-works-heading';
  const stepLabel = t('howItWorks.stepLabel', 'Step');

  return (
    <section
      className="container-main py-12 sm:py-16"
      aria-labelledby={headingId}
    >
      <h2
        id={headingId}
        className="text-center text-xl sm:text-2xl lg:text-3xl font-semibold text-foreground mb-10 sm:mb-14 tracking-tight"
      >
        {t('howItWorks.heading', 'How it works')}
      </h2>

      {/* Desktop: horizontal timeline */}
      <ol
        className="hidden sm:flex items-start justify-center gap-4 lg:gap-6 max-w-4xl mx-auto list-none p-0"
        aria-label={t('howItWorks.label', 'How it works')}
      >
        {STEPS.map(({ icon: Icon, number, title, detail }, i) => {
          const titleId = `how-it-works-step-${number}-title`;
          return (
            <Fragment key={number}>
              <li
                ref={(el) => {
                  stepRefs.current[i] = el;
                }}
                data-step-number={number}
                className="flex flex-col items-center text-center flex-1 min-w-0 stagger-children"
                aria-labelledby={titleId}
              >

                {/* Number badge */}
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold mb-4 bg-gradient-to-br from-accent to-accent/50 text-accent-foreground shadow-lg shadow-accent/20"
                  aria-label={`${stepLabel} ${number}`}
                >
                  <span aria-hidden="true">{number}</span>
                </div>

                <Icon
                  className="h-7 w-7 text-accent mb-3 flex-shrink-0"
                  aria-hidden="true"
                />
                <h3
                  id={titleId}
                  className="text-base font-semibold text-foreground mb-2"
                >
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-[200px]">
                  {detail}
                </p>
              </li>

              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <li
                  className="flex-shrink-0 w-12 lg:w-20 mt-7 list-none"
                  aria-hidden="true"
                >
                  <div className="h-[2px] w-full bg-gradient-to-r from-accent/60 to-accent/10 rounded-full" />
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>


      {/* Mobile: vertical timeline */}
      <ol className="sm:hidden relative pl-10 list-none p-0 m-0">
        {/* Gradient vertical line */}
        <div
          className="absolute left-4 top-2 bottom-2 w-[2px] rounded-full"
          style={{
            background: 'linear-gradient(to bottom, hsl(var(--accent)), hsl(var(--accent) / 0.1))',
          }}
          aria-hidden="true"
        />

        <div className="space-y-8">
          {STEPS.map(({ icon: Icon, number, title, detail }, i) => {
            const titleId = `how-it-works-mobile-step-${number}-title`;
            return (
              <li
                key={number}
                ref={(el) => {
                  // Store mobile refs in the second half of the array; only
                  // one layout is visible per breakpoint so both can register.
                  stepRefs.current[STEPS.length + i] = el;
                }}
                data-step-number={number}
                className="relative"
                aria-labelledby={titleId}
              >


                {/* Node on the line */}
                <div
                  className="absolute -left-10 top-0 w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent/50 flex items-center justify-center text-xs font-bold text-accent-foreground shadow-md shadow-accent/20"
                  aria-label={`${stepLabel} ${number}`}
                >
                  <span aria-hidden="true">{number}</span>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-5 w-5 text-accent flex-shrink-0" aria-hidden="true" />
                    <h3 id={titleId} className="text-sm font-semibold text-foreground">
                      {title}
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{detail}</p>
                </div>
              </li>
            );
          })}
        </div>
      </ol>
    </section>
  );
}
