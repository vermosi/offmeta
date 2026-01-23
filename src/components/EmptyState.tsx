import { SearchX, Lightbulb, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  query?: string;
  onTryExample?: (query: string) => void;
}

const suggestions = [
  "Try broader terms like 'red creatures' instead of specific card names",
  'Check spelling or use simpler keywords',
  "Search by card type: 'legendary dragons'",
  "Search by mechanic: 'cards with flying'",
];

const exampleQueries = [
  'blue counterspells under $5',
  'legendary creatures that draw cards',
  'green ramp spells from modern',
  'artifact creatures with deathtouch',
];

export const EmptyState = ({ query, onTryExample }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 sm:py-20 px-4 text-center animate-reveal">
      <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-secondary flex items-center justify-center mb-5">
        <SearchX className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground" />
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2">
        No cards found
      </h3>

      {query && (
        <p className="text-small text-muted-foreground mb-8 max-w-sm">
          We couldn't find any cards matching "
          <span className="font-medium text-foreground">{query}</span>"
        </p>
      )}

      {/* Tips section */}
      <div className="surface-elevated p-5 max-w-md w-full mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="h-4 w-4 text-accent" />
          <span className="text-small font-medium text-foreground">
            Search tips
          </span>
        </div>
        <ul className="text-small text-muted-foreground space-y-2 text-left">
          {suggestions.map((tip, i) => (
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
            Try one of these searches
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {exampleQueries.map((example) => (
              <Button
                key={example}
                variant="outline"
                size="sm"
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
