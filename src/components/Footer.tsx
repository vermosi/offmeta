/**
 * Footer component with branding and links.
 */

import { ExternalLink } from "lucide-react";

export function Footer() {
  return (
    <footer 
      className="border-t border-border mt-auto"
      role="contentinfo"
    >
      <div className="container-main py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <svg 
              viewBox="0 0 32 32" 
              className="h-6 w-6 text-foreground"
              aria-hidden="true"
            >
              <path d="M16 2L30 16L16 30L2 16L16 2Z" fill="currentColor" opacity="0.08"/>
              <path d="M16 2L30 16L16 30L2 16L16 2Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <path d="M8 16C8 16 11 11 16 11C21 11 24 16 24 16C24 16 21 21 16 21C11 21 8 16 8 16Z" stroke="currentColor" strokeWidth="1.25" fill="none"/>
              <circle cx="16" cy="16" r="2" fill="currentColor"/>
            </svg>
            <span className="text-sm font-medium text-foreground">OffMeta</span>
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
              className="group inline-flex items-center gap-1.5 text-small text-muted-foreground hover:text-foreground transition-colors focus-ring rounded min-h-0"
              aria-label="Powered by Scryfall (opens in new tab)"
            >
              Powered by Scryfall
              <ExternalLink 
                className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" 
                aria-hidden="true"
              />
            </a>
          </nav>

          {/* Copyright */}
          <p className="text-small text-muted-foreground">
            © {new Date().getFullYear()} OffMeta
          </p>
        </div>
        
        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground text-center leading-relaxed max-w-xl mx-auto">
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
            . Magic: The Gathering content © Wizards of the Coast, LLC.
          </p>
        </div>
      </div>
    </footer>
  );
}