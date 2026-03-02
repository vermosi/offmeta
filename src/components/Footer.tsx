/**
 * Footer component with branding, attributions, and legal.
 */

import { Link } from 'react-router-dom';
import { ExternalLink, Github } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useTranslation } from '@/lib/i18n';

const EXPLORE_LINKS = [
  { to: '/docs/syntax', labelKey: 'footer.syntaxCheatSheet', fallback: 'Syntax Cheat Sheet' },
  { to: '/saved', labelKey: 'nav.savedSearches', fallback: 'Saved Searches' },
] as const;

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border mt-auto" role="contentinfo">
      <div className="container-main py-6 sm:py-8 space-y-4">
        {/* Brand row */}
        <div className="flex items-center justify-center sm:justify-start gap-2">
          <Logo variant="mono" className="h-5 w-5 sm:h-6 sm:w-6 text-foreground" />
          <span className="text-xs sm:text-sm font-medium text-foreground">
            OffMeta
          </span>
          <span className="text-xs text-muted-foreground">
            · © {new Date().getFullYear()}
          </span>
        </div>

        {/* Links */}
        <div className="border-t border-border pt-4">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            {EXPLORE_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {t(link.labelKey, link.fallback)}
              </Link>
            ))}
          </div>
        </div>

        {/* Attributions */}
        <div className="border-t border-border pt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-4">
          <span className="text-xs text-muted-foreground">{t('footer.poweredByLabel', 'Powered by')}</span>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <a
              href="https://scryfall.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Scryfall
              <ExternalLink className="h-2.5 w-2.5 opacity-50" aria-hidden="true" />
            </a>
            <span className="text-border">·</span>
            <a
              href="https://github.com/vermosi/offmeta"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              aria-label="View source on GitHub (opens in new tab)"
            >
              <Github className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{t('footer.source')}</span>
            </a>
          </div>
        </div>

        {/* Legal */}
        <div className="border-t border-border/50 pt-3">
          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            {t('footer.legal')}{' '}
            <a
              href="https://company.wizards.com/en/legal/fancontentpolicy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground transition-colors"
            >
              {t('footer.fanPolicy')}
            </a>
            . {t('footer.copyright')}
          </p>
        </div>
      </div>
    </footer>
  );
}
