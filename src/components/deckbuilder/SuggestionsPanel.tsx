/**
 * AI card suggestions panel shown in the right preview column.
 * @module components/deckbuilder/SuggestionsPanel
 */

import { Brain, Sparkles, Loader2, Plus } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';

export interface CardSuggestion {
  card_name: string;
  reason: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
}

interface SuggestionsPanelProps {
  suggestions: CardSuggestion[];
  analysis: string;
  loading: boolean;
  onSuggest: () => void;
  onAddSuggestion: (name: string) => void;
  cardCount: number;
}

export function SuggestionsPanel({
  suggestions, analysis, loading, onSuggest, onAddSuggestion, cardCount,
}: SuggestionsPanelProps) {
  const { t } = useTranslation();
  const priorityColor: Record<string, string> = {
    high: 'text-accent',
    medium: 'text-foreground',
    low: 'text-muted-foreground',
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold flex items-center gap-1.5">
          <Brain className="h-3.5 w-3.5 text-accent" />
          {t('deckEditor.suggestions.title')}
        </h3>
        <Button size="sm" variant="outline" onClick={onSuggest} disabled={loading || cardCount < 5} className="h-7 text-[11px] gap-1">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {loading ? t('deckEditor.suggestions.analyzing') : t('deckEditor.suggestions.suggest')}
        </Button>
      </div>
      {cardCount < 5 && <p className="text-[10px] text-muted-foreground">{t('deckEditor.suggestions.minCards')}</p>}
      {analysis && <p className="text-xs text-muted-foreground bg-secondary/30 rounded-lg p-2">{analysis}</p>}
      {suggestions.length > 0 && (
        <ul className="space-y-1.5">
          {suggestions.map((s, i) => (
            <li key={i} className="flex items-start gap-2 p-2 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-colors group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={cn('text-xs font-semibold', priorityColor[s.priority])}>{s.card_name}</span>
                  <span className="text-[9px] px-1 py-0.5 rounded bg-secondary text-secondary-foreground">{s.category}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{s.reason}</p>
              </div>
              <button
                onClick={() => onAddSuggestion(s.card_name)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors sm:opacity-0 sm:group-hover:opacity-100 shrink-0 mt-0.5"
                aria-label={`Add ${s.card_name}`}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
