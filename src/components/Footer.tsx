import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { GUIDE_SUMMARIES as GUIDES } from '@/data/guide-summaries';
import { useTranslation } from '@/lib/i18n';

const MAX_MOBILE_GUIDES = 5;

const EXPLORE_LINKS = [
  { to: '/combos', labelKey: 'footer.comboFinder', fallback: 'Combo Finder' },
  { to: '/archetypes', labelKey: 'nav.archetypes', fallback: 'Archetypes' },
  { to: '/guides', labelKey: 'header.guides', fallback: 'Guides' },
  { to: '/docs/syntax', labelKey: 'footer.syntaxCheatSheet', fallback: 'Syntax Cheat Sheet' },
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
] as const;

function ExternalAnchor({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
      <ExternalLink className="h-2.5 w-2.5 opacity-40" aria-hidden="true" />
    </a>
  );
}

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="mt-auto border-t border-border/70" role="contentinfo">
      <div className="container-main space-y-5 py-6 sm:py-8">
        <div className="flex items-center justify-center gap-2 sm:justify-start">
          <div className="flex h-5 w-5 items-center justify-center rounded-full border border-border/70 bg-muted/50 text-[10px] font-semibold text-foreground sm:h-6 sm:w-6" aria-hidden="true">
            O
          </div>
          <span className="text-xs font-medium text-foreground sm:text-sm">{t('footer.brand', 'OffMeta')}</span>
          <span className="text-xs text-muted-foreground">· © {new Date().getFullYear()}</span>
        </div>

        <div className="border-t border-border pt-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
            <div>
              <h3 className="mb-2 text-xs font-semibold text-foreground">{t('footer.explore', 'Explore')}</h3>
              <ul className="space-y-1.5">
                {EXPLORE_LINKS.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="text-xs text-muted-foreground transition-colors hover:text-foreground">
                      {t(link.labelKey, link.fallback)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold text-foreground">{t('footer.guides')}</h3>
              <ul className="space-y-1.5">
                {GUIDES.slice(0, MAX_MOBILE_GUIDES).map((guide) => (
                  <li key={guide.slug}>
                    <Link to={`/guides/${guide.slug}`} className="text-xs text-muted-foreground transition-colors hover:text-foreground">
                      {t(`guide.title.${guide.slug}`, guide.title)}
                    </Link>
                  </li>
                ))}
                {GUIDES.length > MAX_MOBILE_GUIDES && (
                  <li>
                    <Link to="/guides" className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                      {t('footer.allGuides', 'All guides')}
                    </Link>
                  </li>
                )}
              </ul>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold text-foreground">{t('footer.dataSources', 'Data Sources')}</h3>
              <ul className="space-y-1.5">
                {DATA_SOURCES.map((source) => (
                  <li key={source.name}>
                    <ExternalAnchor href={source.href}>{source.name}</ExternalAnchor>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold text-foreground">{t('footer.builtWith', 'Built With')}</h3>
              <ul className="space-y-1.5">
                {BUILT_WITH.map((tech) => (
                  <li key={tech.name}>
                    <ExternalAnchor href={tech.href}>{tech.name}</ExternalAnchor>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
          <a
            href="https://discord.gg/9UEv6vrTD4"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
            aria-label={t('footer.discordLabel', 'Join our Discord community (opens in new tab)')}
          >
            Discord
          </a>
          <span>·</span>
          <a
            href="https://github.com/vermosi/offmeta"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
            aria-label={t('footer.githubLabel', 'View source on GitHub (opens in new tab)')}
          >
            GitHub
          </a>
        </div>

        <div className="border-t border-border/50 pt-3">
          <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
            {t('footer.legal')}{' '}
            <a
              href="https://company.wizards.com/en/legal/fancontentpolicy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline transition-colors hover:text-foreground"
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
