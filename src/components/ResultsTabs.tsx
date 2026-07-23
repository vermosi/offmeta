/**
 * Tab navigation for search results: Cards | Similar | Deck Ideas | Explanation
 * Tabs are conditionally shown based on query context.
 * @module components/ResultsTabs
 */

import { cn } from '@/lib/utils';
import { Search, Sparkles, Lightbulb, BookOpen } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export type ResultsTab = 'cards' | 'similar' | 'deck-ideas' | 'explanation';

interface ResultsTabsProps {
  activeTab: ResultsTab;
  onTabChange: (tab: ResultsTab) => void;
  showSimilar: boolean;
  showDeckIdeas: boolean;
  showExplanation: boolean;
  similarLoading?: boolean;
  deckIdeasLoading?: boolean;
  explanationLoading?: boolean;
}

export function ResultsTabs({
  activeTab,
  onTabChange,
  showSimilar,
  showDeckIdeas,
  showExplanation,
  similarLoading,
  deckIdeasLoading,
  explanationLoading,
}: ResultsTabsProps) {
  const { t } = useTranslation();
  // Always show cards tab; others are conditional
  const visibleTabs = [
    { id: 'cards' as const, label: t('results.tabs.cards', 'Cards'), icon: Search, show: true },
    { id: 'similar' as const, label: t('results.tabs.similar', 'Similar'), icon: Sparkles, show: showSimilar, loading: similarLoading },
    { id: 'deck-ideas' as const, label: t('results.tabs.deckIdeas', 'Deck Ideas'), icon: Lightbulb, show: showDeckIdeas, loading: deckIdeasLoading },
    { id: 'explanation' as const, label: t('results.tabs.explain', 'Explain'), icon: BookOpen, show: showExplanation, loading: explanationLoading },
  ].filter((t) => t.show);

  // Don't render tabs if only "Cards" is visible
  if (visibleTabs.length <= 1) return null;

  return (
    <div
      role="tablist"
      aria-label={t('results.tabs.label', 'Result views')}
      className="w-full flex items-center justify-start bg-muted/30 border border-border/30 h-9 rounded-md p-1 gap-1"
    >
      {visibleTabs.map(({ id, label, icon: Icon, loading }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onTabChange(id)}
            className={cn(
              'flex items-center gap-1.5 text-xs px-3 h-7 rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{label}</span>
            {loading && (
              <span
                className="ml-1 h-1.5 w-1.5 rounded-full bg-primary animate-pulse"
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
