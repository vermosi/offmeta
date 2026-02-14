/**
 * Footer component with branding, guide links, and external links.
 */

import { Link } from 'react-router-dom';
import { ExternalLink, Github } from 'lucide-react';
import { GUIDES } from '@/data/guides';

export function Footer() {
  return (
    <footer className="border-t border-border mt-auto" role="contentinfo">
      <div className="container-main py-4 sm:py-6">
        {/* Top row: Logo + Copyright + Links */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <svg
              viewBox="0 0 32 32"
              className="h-5 w-5 sm:h-6 sm:w-6 text-foreground"
              aria-hidden="true"
            >
              <path
                d="M16 2L30 16L16 30L2 16L16 2Z"
                fill="currentColor"
                opacity="0.08"
              />
              <path
                d="M16 2L30 16L16 30L2 16L16 2Z"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
              />
              <path
                d="M8 16C8 16 11 11 16 11C21 11 24 16 24 16C24 16 21 21 16 21C11 21 8 16 8 16Z"
                stroke="currentColor"
                strokeWidth="1.25"
                fill="none"
              />
              <circle cx="16" cy="16" r="2" fill="currentColor" />
            </svg>
            <span className="text-xs sm:text-sm font-medium text-foreground">
              OffMeta
            </span>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              · © {new Date().getFullYear()}
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <a
              href="https://github.com/vermosi/offmeta"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              aria-label="View source on GitHub (opens in new tab)"
            >
              <Github className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Source</span>
            </a>
            <a
              href="https://scryfall.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Powered by Scryfall (opens in new tab)"
            >
              Powered by Scryfall
              <ExternalLink className="h-3 w-3 opacity-50" aria-hidden="true" />
            </a>
            <span className="text-xs text-muted-foreground sm:hidden">
              © {new Date().getFullYear()}
            </span>
          </div>
        </div>

        {/* Guide links */}
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex flex-wrap justify-center gap-x-2 gap-y-1">
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground mr-1">Guides:</span>
            {GUIDES.map((guide, i) => (
              <span key={guide.slug} className="inline-flex items-center">
                <Link
                  to={`/guides/${guide.slug}`}
                  className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {guide.title}
                </Link>
                {i < GUIDES.length - 1 && (
                  <span className="text-border ml-2">·</span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Legal */}
        <div className="mt-2 pt-2 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            Unofficial Fan Content per{' '}
            <a
              href="https://company.wizards.com/en/legal/fancontentpolicy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground transition-colors"
            >
              WotC Fan Content Policy
            </a>
            . Magic: The Gathering © Wizards of the Coast.
          </p>
        </div>
      </div>
    </footer>
  );
}
