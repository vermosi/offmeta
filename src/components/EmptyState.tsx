import { Mic, Wand2 } from "lucide-react";

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
    <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center px-4">
      <div className="relative">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Mic className="h-10 w-10 text-primary" />
        </div>
        <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-background border-2 border-primary/20 flex items-center justify-center">
          <Wand2 className="h-4 w-4 text-primary" />
        </div>
      </div>
      <h2 className="mt-8 text-2xl font-semibold text-foreground">
        Search with your voice
      </h2>
      <p className="mt-3 text-muted-foreground max-w-md leading-relaxed">
        Tap the microphone and describe what you're looking for. 
        <span className="block mt-1 text-sm">
          "I need cheap green ramp spells" or "creatures that make treasure tokens"
        </span>
      </p>
      <p className="mt-6 text-xs text-muted-foreground/70 max-w-sm">
        Your search is translated to Scryfall syntax—results come directly from the official database.
      </p>
    </div>
  );
}
