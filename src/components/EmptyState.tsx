import { SearchX, Lightbulb, RefreshCw, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import type { QuerySuggestion } from '@/hooks/useQuerySuggestions';

interface EmptyStateProps {
  query?: string;
  onTryExample?: (query: string) => void;
  suggestions?: QuerySuggestion[];
  isCheckingSuggestions?: boolean;
  onTrySuggestion?: (scryfallQuery: string) => void;
}

export const EmptyState = ({
  query,
  onTryExample,
  suggestions,
  isCheckingSuggestions,
  onTrySuggestion,
}: EmptyStateProps) => {
  const { t } = useTranslation();

  const tips = [
    t('empty.tip1'),
    t('empty.tip2'),
    t('empty.tip3'),
    t('empty.tip4'),
  ];

  const exampleQueries = [
    t('empty.example1'),
    t('empty.example2'),
    t('empty.example3'),
    t('empty.example4'),
  ];

  const hasSuggestions = suggestions && suggestions.length > 0;

  return (
    <div className="flex flex-col items-center justify-center py-16 sm:py-20 px-4 text-center animate-reveal">
      <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-secondary flex items-center justify-center mb-5">
        <SearchX className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground" />
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2">
        {t('empty.noCards')}
      </h3>

      {query && (
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          {t('empty.noMatch')} "
          <span className="font-medium text-foreground">{query}</span>"
        </p>
      )}

      {/* Did you mean? suggestions */}
      {(hasSuggestions || isCheckingSuggestions) && (
        <div className="surface-elevated p-5 max-w-md w-full mb-6 text-left">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              {t('empty.didYouMean')}
            </span>
            {isCheckingSuggestions && !hasSuggestions && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-auto" />
            )}
          </div>

          {hasSuggestions && (
            <div className="space-y-2">
              {suggestions!.map((s) => (
                <button
                  key={s.query}
                  type="button"
                  onClick={() => onTrySuggestion?.(s.query)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg
                    bg-primary/5 hover:bg-primary/10 border border-primary/10 hover:border-primary/20
                    transition-colors text-left group"
                >
                  <div className="min-w-0">
                    <code className="text-xs font-mono text-foreground break-all leading-relaxed">
                      {s.query}
                    </code>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {s.label}
                      {s === suggestions![0] ? ' • Best match' : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-primary/70 group-hover:text-primary tabular-nums">
                    {t('empty.cardCount').replace('{count}', s.totalCards.toLocaleString())}
                  </span>
                </button>
              ))}
            </div>
          )}

          {isCheckingSuggestions && !hasSuggestions && (
            <p className="text-xs text-muted-foreground">
              {t('empty.checkingAlternatives')}
            </p>
          )}
        </div>
      )}

      {/* Tips section */}
      <div className="surface-elevated p-5 max-w-md w-full mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="h-4 w-4 text-accent" />
          <span className="text-sm font-medium text-foreground">
            {t('empty.tips')}
          </span>
        </div>
        <ul className="text-sm text-muted-foreground space-y-2 text-left">
          {tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-accent mt-0.5">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Example queries */}
      {onTryExample && (
        <div className="w-full max-w-md">
          <p className="text-xs text-muted-foreground mb-3 flex items-center justify-center gap-1.5">
            <RefreshCw className="h-3 w-3" />
            {t('empty.tryOne')}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {exampleQueries.map((example) => (
              <Button
                key={example}
                variant="outline"
                size="sm"
                type="button"
                onClick={() => onTryExample(example)}
                className="text-xs magnetic"
              >
                {example}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
