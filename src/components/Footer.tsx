import { ExternalLink } from 'lucide-react';

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-border/30 mt-auto">
      <div className="glass-strong">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Left: Logo and branding */}
            <div className="flex items-center gap-3">
              <svg 
                viewBox="0 0 32 32" 
                className="h-6 w-6 text-primary"
                aria-hidden="true"
              >
                <path d="M16 2L30 16L16 30L2 16L16 2Z" fill="currentColor" opacity="0.15"/>
                <path d="M16 2L30 16L16 30L2 16L16 2Z" stroke="currentColor" strokeWidth="2" fill="none"/>
                <path d="M8 16C8 16 11 11 16 11C21 11 24 16 24 16C24 16 21 21 16 21C11 21 8 16 8 16Z" fill="currentColor" opacity="0.2"/>
                <circle cx="16" cy="16" r="3" fill="currentColor"/>
              </svg>
              <span className="text-sm font-medium text-muted-foreground">OffMeta</span>
            </div>

            {/* Center: Links */}
            <div className="flex items-center gap-6 text-sm">
              <span className="text-muted-foreground">Powered by</span>
              <a 
                href="https://scryfall.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors font-medium min-h-0"
              >
                Scryfall
                <ExternalLink className="h-3 w-3" />
              </a>
              <a 
                href="https://scryfall.com/docs/api" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors min-h-0"
              >
                API
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-border/30">
            <p className="text-[11px] text-muted-foreground text-center leading-relaxed max-w-2xl mx-auto">
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
        </div>
      </div>
    </footer>
  );
}