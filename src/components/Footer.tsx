import { ExternalLink } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-card/50 mt-auto">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-5 space-y-2 sm:space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground">
          <span>Powered by</span>
          <a 
            href="https://scryfall.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors font-medium min-h-0"
          >
            Scryfall
            <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
          </a>
          <span className="hidden sm:inline text-border">•</span>
          <a 
            href="https://scryfall.com/docs/api" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors min-h-0"
          >
            API Docs
            <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
          </a>
        </div>
        
        <p className="text-[9px] sm:text-[10px] text-muted-foreground text-center max-w-xl mx-auto leading-relaxed">
          Unofficial Fan Content per{' '}
          <a 
            href="https://company.wizards.com/en/legal/fancontentpolicy" 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            WotC Fan Content Policy
          </a>
          . Magic: The Gathering content © Wizards of the Coast, LLC. Not produced by or endorsed by WotC.
        </p>
      </div>
    </footer>
  );
}
