/**
 * Intent-aware next-step suggestions shown after a successful search.
 * Helps users move from "I found cards" to "what should I do with them?"
 */

import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Compass, Sparkles } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useTranslation } from '@/lib/i18n';
import type { SearchIntent } from '@/types/search';

interface SearchNextActionsProps {
  intent: SearchIntent | null;
  originalQuery: string;
  totalCards: number;
  isDeckQuery: boolean;
  queryQualityScore: number;
}

type Action = {
  to: string;
  labelKey: string;
  descriptionKey: string;
  icon: typeof ArrowRight;
};

function chooseActions({
  intent,
  originalQuery,
  totalCards,
  isDeckQuery,
  queryQualityScore,
}: SearchNextActionsProps): Action[] {
  const text =
    `${originalQuery} ${intent?.tags.join(' ') ?? ''} ${intent?.types.join(' ') ?? ''}`.toLowerCase();
  const actions: Action[] = [];

  if (isDeckQuery || text.includes('commander') || text.includes('edh')) {
    actions.push({
      to: '/combos',
      labelKey: 'results.nextActions.combos.label',
      descriptionKey: 'results.nextActions.combos.description',
      icon: Compass,
    });
    actions.push({
      to: '/search-intents',
      labelKey: 'results.nextActions.guides.label',
      descriptionKey: 'results.nextActions.guides.descriptionFallback',
      icon: BookOpen,
    });
  } else if (
    text.includes('tribe') ||
    text.includes('dragon') ||
    text.includes('elf') ||
    text.includes('goblin')
  ) {
    actions.push({
      to: '/guides',
      labelKey: 'results.nextActions.guides.label',
      descriptionKey: 'results.nextActions.guides.description',
      icon: BookOpen,
    });
    actions.push({
      to: '/search-intents',
      labelKey: 'results.nextActions.combos.label',
      descriptionKey: 'results.nextActions.combos.descriptionFallback',
      icon: Compass,
    });
  } else if (totalCards > 50 && queryQualityScore >= 0.5) {
    actions.push({
      to: '/guides',
      labelKey: 'results.nextActions.guides.label',
      descriptionKey: 'results.nextActions.guides.descriptionBroad',
      icon: BookOpen,
    });
    actions.push({
      to: '/search-intents',
      labelKey: 'results.nextActions.combos.label',
      descriptionKey: 'results.nextActions.combos.descriptionFallback',
      icon: Compass,
    });
  } else {
    actions.push({
      to: '/search-intents',
      labelKey: 'results.nextActions.combos.label',
      descriptionKey: 'results.nextActions.combos.descriptionFallback',
      icon: Compass,
    });
    actions.push({
      to: '/guides',
      labelKey: 'results.nextActions.guides.label',
      descriptionKey: 'results.nextActions.guides.descriptionFallback',
      icon: BookOpen,
    });
  }

  return actions.slice(0, 2);
}

export function SearchNextActions(props: SearchNextActionsProps) {
  const actions = chooseActions(props);
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const [primary, secondary] = actions;

  return (
    <section className="rounded-2xl border border-border/60 bg-gradient-to-br from-card/85 to-background/70 p-3.5 sm:p-4 shadow-sm animate-reveal">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t('results.nextActions.title', 'Next step')}
          </p>
          <p className="mt-1 text-sm text-foreground">
            {t(
              'results.nextActions.subtitle',
              'Choose one follow-up from the cards you just found.',
            )}
          </p>
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        {primary && (
          <Link
            to={primary.to}
            onClick={() =>
              trackEvent('next_step_action_clicked', {
                action: t(primary.labelKey),
                placement: 'search_next_actions',
                cta: primary.to,
              })
            }
            className="group flex items-start gap-3 rounded-xl border border-accent/20 bg-accent/5 px-3 py-3 transition-colors hover:border-accent/30 hover:bg-accent/10"
          >
            <primary.icon
              className="mt-0.5 h-4 w-4 text-accent"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">
                  {t(primary.labelKey)}
                </span>
                <Sparkles
                  className="h-3 w-3 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t(primary.descriptionKey)}
              </p>
            </div>
          </Link>
        )}
        {secondary && (
          <Link
            to={secondary.to}
            onClick={() =>
              trackEvent('next_step_action_clicked', {
                action: t(secondary.labelKey),
                placement: 'search_next_actions',
                cta: secondary.to,
              })
            }
            className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/50 px-3 py-1.5 text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:border-border hover:text-foreground"
          >
            <secondary.icon
              className="h-3.5 w-3.5 text-accent"
              aria-hidden="true"
            />
            <span>{t(secondary.labelKey)}</span>
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        )}
      </div>
    </section>
  );
}
