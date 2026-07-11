/**
 * Intent-aware next-step suggestions shown after a successful search.
 * Helps users move from "I found cards" to "what should I do with them?"
 */

import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, GitBranch, Lightbulb, Zap } from 'lucide-react';
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
  const text = `${originalQuery} ${intent?.tags.join(' ') ?? ''} ${intent?.types.join(' ') ?? ''}`.toLowerCase();
  const actions: Action[] = [];

  if (isDeckQuery || text.includes('commander') || text.includes('edh')) {
    actions.push({
      to: '/deck-recs',
      labelKey: 'results.nextActions.deckRecs.label',
      descriptionKey: 'results.nextActions.deckRecs.description',
      icon: Lightbulb,
    });
    actions.push({
      to: '/combos',
      labelKey: 'results.nextActions.combos.label',
      descriptionKey: 'results.nextActions.combos.description',
      icon: Zap,
    });
  } else if (text.includes('tribe') || text.includes('dragon') || text.includes('elf') || text.includes('goblin')) {
    actions.push({
      to: '/guides',
      labelKey: 'results.nextActions.guides.label',
      descriptionKey: 'results.nextActions.guides.description',
      icon: BookOpen,
    });
    actions.push({
      to: '/archetypes',
      labelKey: 'results.nextActions.archetypes.label',
      descriptionKey: 'results.nextActions.archetypes.description',
      icon: GitBranch,
    });
  } else if (totalCards > 50 && queryQualityScore >= 0.5) {
    actions.push({
      to: '/combos',
      labelKey: 'results.nextActions.combos.label',
      descriptionKey: 'results.nextActions.combos.descriptionBroad',
      icon: Zap,
    });
    actions.push({
      to: '/guides',
      labelKey: 'results.nextActions.guides.label',
      descriptionKey: 'results.nextActions.guides.descriptionBroad',
      icon: BookOpen,
    });
  } else {
    actions.push({
      to: '/deck-recs',
      labelKey: 'results.nextActions.deckRecs.label',
      descriptionKey: 'results.nextActions.deckRecs.descriptionFallback',
      icon: Lightbulb,
    });
    actions.push({
      to: '/guides',
      labelKey: 'results.nextActions.guides.label',
      descriptionKey: 'results.nextActions.guides.descriptionFallback',
      icon: BookOpen,
    });
  }

  actions.push({
    to: '/archetypes',
    labelKey: 'results.nextActions.archetypes.label',
    descriptionKey: 'results.nextActions.archetypes.descriptionFallback',
    icon: GitBranch,
  });

  return actions.slice(0, 3);
}

export function SearchNextActions(props: SearchNextActionsProps) {
  const actions = chooseActions(props);
  const { t } = useTranslation();

  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 p-3 sm:p-4 animate-reveal">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t('results.nextActions.title', 'What next?')}
          </p>
          <p className="mt-1 text-sm text-foreground">
            {t(
              'results.nextActions.subtitle',
              'Pick a next move from the cards you just found.',
            )}
          </p>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {actions.map(({ to, labelKey, descriptionKey, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="group flex items-start gap-3 rounded-xl border border-transparent bg-background/40 px-3 py-3 transition-colors hover:border-accent/25 hover:bg-accent/5"
          >
            <Icon className="mt-0.5 h-4 w-4 text-accent" aria-hidden="true" />
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">
                  {t(labelKey)}
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t(descriptionKey)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
