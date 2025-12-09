import { Sparkles, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/UserMenu";

interface HeaderProps {
  onRandomCard: () => void;
  isLoading: boolean;
}

export function Header({ onRandomCard, isLoading }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative">
            <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-primary animate-pulse-glow" />
            <div className="absolute inset-0 blur-xl bg-primary/30" />
          </div>
          <div>
            <h1 className="font-display text-lg sm:text-xl font-bold tracking-wide text-foreground">
              Off<span className="text-primary text-glow">Meta</span>
            </h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">MTG Deck Brewer</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onRandomCard}
            disabled={isLoading}
            className="gap-1.5 h-8 sm:h-9 px-2 sm:px-3"
          >
            <Shuffle className="h-4 w-4" />
            <span className="hidden sm:inline">Random</span>
          </Button>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
