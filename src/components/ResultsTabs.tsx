/**
 * Tab navigation for search results: Cards | Similar | Deck Ideas | Explanation
 * Tabs are conditionally shown based on query context.
 * @module components/ResultsTabs
 */

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Sparkles, Lightbulb, BookOpen } from 'lucide-react';

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
  // Always show cards tab; others are conditional
  const visibleTabs = [
    { id: 'cards' as const, label: 'Cards', icon: Search, show: true },
    { id: 'similar' as const, label: 'Similar', icon: Sparkles, show: showSimilar, loading: similarLoading },
    { id: 'deck-ideas' as const, label: 'Deck Ideas', icon: Lightbulb, show: showDeckIdeas, loading: deckIdeasLoading },
    { id: 'explanation' as const, label: 'Explain', icon: BookOpen, show: showExplanation, loading: explanationLoading },
  ].filter((t) => t.show);

  // Don't render tabs if only "Cards" is visible
  if (visibleTabs.length <= 1) return null;

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => onTabChange(v as ResultsTab)}
      className="w-full"
    >
      <TabsList className="w-full justify-start bg-muted/30 border border-border/30 h-9">
        {visibleTabs.map(({ id, label, icon: Icon, loading }) => (
          <TabsTrigger
            key={id}
            value={id}
            className="flex items-center gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{label}</span>
            {loading && (
              <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            )}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
