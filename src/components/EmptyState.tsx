import { Wand2, Search } from "lucide-react";

interface EmptyStateProps {
  hasSearched: boolean;
}

export function EmptyState({ hasSearched }: EmptyStateProps) {
  if (hasSearched) {
    return (
      <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center px-4">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <Wand2 className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="mt-6 text-lg font-semibold text-foreground">
          No cards found
        </h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          Try describing what you need differently, or be more specific about the card type or effect.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
      <div className="relative">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Search className="h-8 w-8 text-primary" />
        </div>
        <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-background border-2 border-primary/20 flex items-center justify-center">
          <Wand2 className="h-3.5 w-3.5 text-primary" />
        </div>
      </div>
      <p className="mt-6 text-sm text-muted-foreground max-w-sm">
        Results come directly from Scryfall's official database.
      </p>
    </div>
  );
}
