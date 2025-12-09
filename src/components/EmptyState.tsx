import { Sparkles, Search } from "lucide-react";

interface EmptyStateProps {
  hasSearched: boolean;
}

export function EmptyState({ hasSearched }: EmptyStateProps) {
  if (hasSearched) {
    return (
      <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
        <Search className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground/50" />
        <h2 className="mt-4 sm:mt-6 font-display text-xl sm:text-2xl font-bold text-foreground">
          No Cards Found
        </h2>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-md">
          Try different search terms or adjust your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-10 sm:py-16 text-center px-4">
      <div className="relative">
        <div className="absolute inset-0 blur-3xl bg-primary/20 rounded-full animate-pulse" />
        <Sparkles className="relative h-14 w-14 sm:h-20 sm:w-20 text-primary animate-float" />
      </div>
      <h2 className="mt-6 sm:mt-8 font-display text-2xl sm:text-3xl font-bold text-foreground">
        Explore the <span className="text-primary text-glow">Multiverse</span>
      </h2>
      <p className="mt-2 sm:mt-3 text-sm sm:text-base text-muted-foreground max-w-sm sm:max-w-md">
        Use AI Search to describe cards naturally, or switch to Scryfall syntax for precise queries.
      </p>
    </div>
  );
}
