import { Sparkles, Search } from "lucide-react";

interface EmptyStateProps {
  hasSearched: boolean;
}

export function EmptyState({ hasSearched }: EmptyStateProps) {
  if (hasSearched) {
    return (
      <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center px-4">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <Search className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="mt-6 text-lg font-semibold text-foreground">
          No results found
        </h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          Try adjusting your search terms or filters to find what you're looking for.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center px-4">
      <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
        <Sparkles className="h-7 w-7 text-primary" />
      </div>
      <h2 className="mt-6 text-xl font-semibold text-foreground">
        Start exploring
      </h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-md leading-relaxed">
        Use AI to describe what you're looking for in natural language, 
        or switch to Scryfall syntax for precise queries.
      </p>
    </div>
  );
}