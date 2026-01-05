import { ExternalLink } from 'lucide-react';

export function Footer() {
  return (
    <footer 
      className="relative z-10 border-t border-border/30 mt-auto"
      role="contentinfo"
    >
      <div className="glass-strong">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <svg 
                viewBox="0 0 32 32" 
                className="h-5 w-5 text-muted-foreground"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M16 2L30 16L16 30L2 16L16 2Z" fill="currentColor" opacity="0.1"/>
                <path d="M16 2L30 16L16 30L2 16L16 2Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                <circle cx="16" cy="16" r="2.5" fill="currentColor"/>
              </svg>
              <span className="text-sm font-medium text-muted-foreground">OffMeta</span>
            </div>

            {/* Links */}
            <nav aria-label="Footer navigation">
              <ul className="flex items-center gap-6 text-sm">
                <li>
                  <span className="text-muted-foreground">Powered by</span>
                </li>
                <li>
                  <a 
                    href="https://scryfall.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-foreground hover:text-accent transition-colors font-medium min-h-0 focus-ring rounded"
                  >
                    Scryfall
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    <span className="sr-only">(opens in new tab)</span>
                  </a>
                </li>
                <li>
                  <a 
                    href="https://scryfall.com/docs/api" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors min-h-0 focus-ring rounded"
                  >
                    API
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    <span className="sr-only">(opens in new tab)</span>
                  </a>
                </li>
              </ul>
            </nav>
          </div>
          
          <div className="mt-6 pt-6 border-t border-border/30">
            <p className="text-[11px] text-muted-foreground text-center leading-relaxed max-w-2xl mx-auto">
              Unofficial Fan Content per{' '}
              <a 
                href="https://company.wizards.com/en/legal/fancontentpolicy" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors focus-ring rounded"
              >
                WotC Fan Content Policy
                <span className="sr-only">(opens in new tab)</span>
              </a>
              . Magic: The Gathering content © Wizards of the Coast, LLC. Not produced by or endorsed by WotC.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}