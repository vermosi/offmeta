import { Sparkles, Search } from "lucide-react";

interface EmptyStateProps {
  hasSearched: boolean;
}

export function EmptyState({ hasSearched }: EmptyStateProps) {
  if (hasSearched) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="relative">
          <Search className="h-16 w-16 text-muted-foreground/50" />
        </div>
        <h2 className="mt-6 font-display text-2xl font-bold text-foreground">
          No Cards Found
        </h2>
        <p className="mt-2 text-muted-foreground max-w-md">
          Try adjusting your search terms or use Scryfall's advanced syntax for more specific results.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="relative">
        <div className="absolute inset-0 blur-3xl bg-primary/20 rounded-full animate-pulse" />
        <Sparkles className="relative h-20 w-20 text-primary animate-float" />
      </div>
      <h2 className="mt-8 font-display text-3xl font-bold text-foreground">
        Explore the <span className="text-primary text-glow">Multiverse</span>
      </h2>
      <p className="mt-3 text-muted-foreground max-w-md text-lg">
        Search through thousands of Magic: The Gathering cards from every set and expansion.
      </p>
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <SearchTip>Try "lightning bolt"</SearchTip>
        <SearchTip>Color: "c:blue"</SearchTip>
        <SearchTip>Type: "t:dragon"</SearchTip>
        <SearchTip>Set: "s:dmu"</SearchTip>
      </div>
    </div>
  );
}

function SearchTip({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-2 bg-muted/50 rounded-lg border border-border/50 text-muted-foreground">
      {children}
    </div>
  );
}
