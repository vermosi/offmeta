import { Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/UserMenu";
import { ThemeToggle } from "@/components/ThemeToggle";

interface HeaderProps {
  onRandomCard: () => void;
  isLoading: boolean;
}

export function Header({ onRandomCard, isLoading }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-foreground flex items-center justify-center shadow-sm">
              <span className="text-background font-bold text-sm tracking-tight">OM</span>
            </div>
            <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
              OffMeta
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRandomCard}
            disabled={isLoading}
            className="gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Shuffle className="h-4 w-4" />
            <span className="hidden sm:inline">Random</span>
          </Button>
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
