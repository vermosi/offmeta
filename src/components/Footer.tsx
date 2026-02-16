/**
 * Footer component with branding, guide links, and external links.
 */

import { Link } from 'react-router-dom';
import { ExternalLink, Github } from 'lucide-react';
import { GUIDES } from '@/data/guides';
import { Logo } from '@/components/Logo';
import { useTranslation } from '@/lib/i18n';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border mt-auto" role="contentinfo">
      <div className="container-main py-6 sm:py-8">
        {/* Top row: Logo + Copyright + Links */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <Logo variant="mono" className="h-5 w-5 sm:h-6 sm:w-6 text-foreground" />
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
              <span className="hidden sm:inline">{t('footer.source')}</span>
            </a>
            <a
              href="https://scryfall.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Powered by Scryfall (opens in new tab)"
            >
              {t('footer.poweredBy')}
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
            <span className="text-xs font-medium text-muted-foreground mr-1">{t('footer.guides')}:</span>
            {GUIDES.map((guide, i) => (
              <span key={guide.slug} className="inline-flex items-center">
                <Link
                  to={`/guides/${guide.slug}`}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
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
