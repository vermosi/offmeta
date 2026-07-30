/**
 * Footer component with branding, explore links, guide links, attributions, and legal.
 */

import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { GUIDE_SUMMARIES as GUIDES } from '@/data/guide-summaries';
import { useTranslation } from '@/lib/i18n';

const MAX_MOBILE_GUIDES = 5;

const EXPLORE_LINKS = [
  { to: '/combos', labelKey: 'footer.comboFinder', fallback: 'Combo Finder' },
  { to: '/archetypes', labelKey: 'nav.archetypes', fallback: 'Archetypes' },
  { to: '/guides', labelKey: 'header.guides', fallback: 'Guides' },
  {
    to: '/docs/syntax',
    labelKey: 'footer.syntaxCheatSheet',
    fallback: 'Syntax Cheat Sheet',
  },
  { to: '/about', labelKey: 'footer.about', fallback: 'About' },
] as const;

const DATA_SOURCES = [
  { name: 'Scryfall', href: 'https://scryfall.com' },
  { name: 'Moxfield', href: 'https://www.moxfield.com' },
  { name: 'Commander Spellbook', href: 'https://commanderspellbook.com' },
  { name: 'TopDeck.gg', href: 'https://topdeck.gg' },
] as const;

const BUILT_WITH = [
  { name: 'React', href: 'https://react.dev' },
  { name: 'TypeScript', href: 'https://www.typescriptlang.org' },
  { name: 'Tailwind CSS', href: 'https://tailwindcss.com' },
  { name: 'Vite', href: 'https://vitejs.dev' },
  { name: 'Lovable', href: 'https://lovable.dev' },
] as const;

function ExternalAnchor({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      {children}
      <ExternalLink className="h-2.5 w-2.5 opacity-40" aria-hidden="true" />
    </a>
  );
}

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border mt-auto" role="contentinfo">
      <div className="container-main py-6 sm:py-8 space-y-5">
        {/* Brand row */}
        <div className="flex items-center justify-center sm:justify-start gap-2">
          <div
            className="h-5 w-5 sm:h-6 sm:w-6 rounded-full border border-border/70 bg-muted/50 flex items-center justify-center text-[10px] font-semibold text-foreground"
            aria-hidden="true"
          >
            O
          </div>
          <span className="text-xs sm:text-sm font-medium text-foreground">
            {t('footer.brand', 'OffMeta')}
          </span>
          <span className="text-xs text-muted-foreground">
            · © {new Date().getFullYear()}
          </span>
        </div>

        {/* Links grid — 2 cols mobile, 4 cols desktop */}
        <div className="border-t border-border pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-5">
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

            {/* Data Sources column */}
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-2">
                {t('footer.dataSources', 'Data Sources')}
              </h3>
              <ul className="space-y-1.5">
                {DATA_SOURCES.map((source) => (
                  <li key={source.name}>
                    <ExternalAnchor href={source.href}>
                      {source.name}
                    </ExternalAnchor>
                  </li>
                ))}
              </ul>
            </div>

            {/* Built With column */}
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-2">
                {t('footer.builtWith', 'Built With')}
              </h3>
              <ul className="space-y-1.5">
                {BUILT_WITH.map((tech) => (
                  <li key={tech.name}>
                    <ExternalAnchor href={tech.href}>
                      {tech.name}
                    </ExternalAnchor>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Community row */}
        <div className="border-t border-border pt-4 flex items-center justify-center gap-4">
          <a
            href="https://discord.gg/9UEv6vrTD4"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            aria-label={t(
              'footer.discordLabel',
              'Join our Discord community (opens in new tab)',
            )}
          >
            <svg
              className="h-3.5 w-3.5"
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
            </svg>
            {t('footer.discord')}
          </a>
          <span className="text-border">·</span>
          <a
            href="https://github.com/vermosi/offmeta"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            aria-label={t(
              'footer.githubLabel',
              'View source on GitHub (opens in new tab)',
            )}
          >
            <svg
              className="h-3.5 w-3.5"
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.865 8.37 6.839 9.72.5.09.683-.22.683-.49 0-.24-.01-1.04-.015-1.89-2.782.62-3.369-1.21-3.369-1.21-.455-1.18-1.11-1.49-1.11-1.49-.907-.64.069-.63.069-.63 1.003.07 1.531 1.05 1.531 1.05.89 1.56 2.336 1.11 2.904.85.09-.66.35-1.11.635-1.36-2.22-.26-4.555-1.14-4.555-5.08 0-1.12.39-2.03 1.029-2.75-.103-.26-.446-1.31.098-2.73 0 0 .84-.27 2.75 1.05A9.31 9.31 0 0 1 12 6.84c.85.004 1.705.12 2.505.35 1.91-1.32 2.75-1.05 2.75-1.05.544 1.42.201 2.47.098 2.73.64.72 1.028 1.63 1.028 2.75 0 3.95-2.34 4.82-4.566 5.08.359.32.679.94.679 1.89 0 1.36-.012 2.46-.012 2.79 0 .27.18.58.688.48A10.25 10.25 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
            </svg>
            {t('footer.source')}
          </a>
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
