/**
 * Footer component with branding, explore links, guide links, attributions, and legal.
 */

import { Link } from 'react-router-dom';
import { ExternalLink, Github } from 'lucide-react';
import { GUIDES } from '@/data/guides';
import { Logo } from '@/components/Logo';
import { useTranslation } from '@/lib/i18n';

const MAX_MOBILE_GUIDES = 5;

const EXPLORE_LINKS = [
  { to: '/archetypes', labelKey: 'nav.archetypes', fallback: 'Archetypes' },
  { to: '/deck-recs', labelKey: 'nav.deckRecs', fallback: 'Deck Recs' },
  { to: '/combos', labelKey: 'footer.comboFinder', fallback: 'Combo Finder' },
  { to: '/deckbuilder', labelKey: 'nav.deckBuilder', fallback: 'Deck Builder' },
  { to: '/docs/syntax', labelKey: 'footer.syntaxCheatSheet', fallback: 'Syntax Cheat Sheet' },
  { to: '/about', labelKey: 'footer.about', fallback: 'About' },
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

        {/* Links grid */}
        <div className="border-t border-border pt-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {/* Explore column */}
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-2">
                {t('footer.explore', 'Explore')}
              </h3>
              <ul className="space-y-1.5">
                {EXPLORE_LINKS.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {t(link.labelKey, link.fallback)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Guides column */}
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-2">
                {t('footer.guides')}
              </h3>
              <ul className="space-y-1.5">
                {GUIDES.slice(0, MAX_MOBILE_GUIDES).map((guide) => (
                  <li key={guide.slug}>
                    <Link
                      to={`/guides/${guide.slug}`}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {t(`guide.title.${guide.slug}`, guide.title)}
                    </Link>
                  </li>
                ))}
                {GUIDES.length > MAX_MOBILE_GUIDES && (
                  <li>
                    <Link
                      to="/guides"
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
                    >
                      {t('footer.allGuides', 'All guides →')}
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Attributions */}
        <div className="border-t border-border pt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-4">
          <span className="text-xs text-muted-foreground">Powered by</span>
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
              href="https://www.moxfield.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Moxfield
              <ExternalLink className="h-2.5 w-2.5 opacity-50" aria-hidden="true" />
            </a>
            <span className="text-border">·</span>
            <a
              href="https://commanderspellbook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Commander Spellbook
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
