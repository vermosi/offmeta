import { SearchX, Lightbulb, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  query?: string;
  onTryExample?: (query: string) => void;
}

const suggestions = [
  "Try broader terms like 'red creatures' instead of specific card names",
  "Check spelling or use simpler keywords",
  "Search by card type: 'legendary dragons'",
  "Search by mechanic: 'cards with flying'",
];

const exampleQueries = [
  "blue counterspells under $5",
  "legendary creatures that draw cards",
  "green ramp spells from modern",
  "artifact creatures with deathtouch",
];

export const EmptyState = ({ query, onTryExample }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4 text-center">
      <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-muted/50 flex items-center justify-center mb-4 sm:mb-6">
        <SearchX className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
      </div>
      
      <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
        No cards found
      </h3>
      
      {query && (
        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          We couldn't find any cards matching "<span className="font-medium text-foreground">{query}</span>"
        </p>
      )}

      {/* Tips section */}
      <div className="bg-muted/30 rounded-lg p-4 sm:p-5 max-w-md w-full mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="h-4 w-4 text-accent" />
          <span className="text-sm font-medium text-foreground">Search tips</span>
        </div>
        <ul className="text-xs sm:text-sm text-muted-foreground space-y-2 text-left">
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
                className="text-xs h-8 px-3 hover:bg-accent hover:text-accent-foreground transition-colors"
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
