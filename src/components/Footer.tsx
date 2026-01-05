/**
 * Footer component with branding and links.
 */

import { ExternalLink } from "lucide-react";

export function Footer() {
  return (
    <footer 
      className="relative z-20 border-t border-border/30 mt-auto"
      role="contentinfo"
    >
      <div className="glass-strong">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            {/* Logo and branding */}
            <div className="flex items-center gap-3">
              <svg 
                viewBox="0 0 32 32" 
                className="h-8 w-8 text-foreground"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M16 2L30 16L16 30L2 16L16 2Z" fill="currentColor" opacity="0.06"/>
                <path d="M16 2L30 16L16 30L2 16L16 2Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                <path d="M8 16C8 16 11 11 16 11C21 11 24 16 24 16C24 16 21 21 16 21C11 21 8 16 8 16Z" fill="currentColor" opacity="0.1"/>
                <path d="M8 16C8 16 11 11 16 11C21 11 24 16 24 16C24 16 21 21 16 21C11 21 8 16 8 16Z" stroke="currentColor" strokeWidth="1.25" fill="none"/>
                <circle cx="16" cy="16" r="2.5" fill="currentColor"/>
              </svg>
              <span className="text-lg font-semibold text-foreground">OffMeta</span>
            </div>

            {/* Links */}
            <nav 
              className="flex items-center gap-6"
              aria-label="Footer navigation"
            >
              <a
                href="https://scryfall.com"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors focus-ring rounded min-h-0"
                aria-label="Powered by Scryfall (opens in new tab)"
              >
                <span>Powered by Scryfall</span>
                <ExternalLink 
                  className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 transition-opacity" 
                  aria-hidden="true"
                />
              </a>
            </nav>

            {/* Copyright */}
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} OffMeta
            </p>
          </div>
          
          <div className="mt-8 pt-6 border-t border-border/30">
            <p className="text-xs text-muted-foreground text-center leading-relaxed max-w-2xl mx-auto">
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