import { ExternalLink } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-card/50 mt-auto">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <span>Powered by</span>
          <a 
            href="https://scryfall.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-accent hover:text-accent/80 transition-colors font-medium"
          >
            Scryfall
            <ExternalLink className="h-3 w-3" />
          </a>
          <span className="hidden sm:inline text-border">•</span>
          <a 
            href="https://scryfall.com/docs/api" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          >
            API Documentation
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        
        <p className="text-[10px] sm:text-xs text-muted-foreground/70 text-center max-w-2xl mx-auto leading-relaxed">
          Portions of this site are unofficial Fan Content permitted under the{' '}
          <a 
            href="https://company.wizards.com/en/legal/fancontentpolicy" 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline hover:text-muted-foreground transition-colors"
          >
            Wizards of the Coast Fan Content Policy
          </a>
          . The literal and graphical information presented on this site about Magic: The Gathering, including card images and mana symbols, is copyright Wizards of the Coast, LLC. This site is not produced by or endorsed by Wizards of the Coast.
        </p>
      </div>
    </footer>
  );
}
