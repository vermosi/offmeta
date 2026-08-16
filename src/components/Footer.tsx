/**
 * Footer component with branding, explore links, guide links, attributions, and legal.
 */

import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { ExternalLink } from 'lucide-react';
import { GUIDE_SUMMARIES as GUIDES } from '@/data/guide-summaries';
import { useTranslation } from '@/lib/i18n';
import {
  NAV_BRAND_CLASS,
  NAV_EYEBROW_CLASS,
  NAV_LINK_CLASS,
  NAV_LINK_GAP_CLASS,
  NAV_LINK_WITH_ICON_CLASS,
  NAV_LOGO_CLASS,
  NAV_WORDMARK_CLASS,
} from '@/lib/ui/nav-tokens';

const MAX_MOBILE_GUIDES = 5;

const EXPLORE_LINKS = [
  { to: '/combos', labelKey: 'footer.comboFinder', fallback: 'Combo Finder' },
  { to: '/guides', labelKey: 'header.guides', fallback: 'Guides' },
  { to: '/docs/syntax', labelKey: 'footer.syntaxCheatSheet', fallback: 'Syntax Cheat Sheet' },
  { to: '/about', labelKey: 'footer.about', fallback: 'About' },
  { to: '/privacy', labelKey: 'footer.privacy', fallback: 'Privacy' },
  { to: '/terms', labelKey: 'footer.terms', fallback: 'Terms' },
] as const;

const DATA_SOURCES = [
  { name: 'Scryfall', href: 'https://scryfall.com' },
  { name: 'Moxfield', href: 'https://www.moxfield.com' },
  { name: 'Commander Spellbook', href: 'https://commanderspellbook.com' },
  { name: 'TopDeck.gg', href: 'https://topdeck.gg' },
] as const;

const PARTNERS = [
  { name: 'Lifelink MTG', href: 'https://lifelinkmtg.app' },
] as const;

const LINK_CLASS = NAV_LINK_CLASS;

const SOCIAL_LINK_CLASS = NAV_LINK_WITH_ICON_CLASS;

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className={`mb-3 ${NAV_EYEBROW_CLASS}`}>
        {title}
      </h2>
      <ul className="space-y-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className={LINK_CLASS}>
      {children}
    </Link>
  );
}

function handleExternalClick(
  e: React.MouseEvent<HTMLAnchorElement>,
  href: string,
) {
  if (typeof window.gtagSendEvent === 'function') {
    e.preventDefault();
    window.gtagSendEvent(href);
  }
}

function ExternalAnchor({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => handleExternalClick(e, href)}
      className={`${LINK_CLASS} inline-flex items-center gap-1`}
    >
      {children}
      <ExternalLink className="h-2.5 w-2.5 opacity-40" aria-hidden="true" />
    </a>
  );
}



export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="mt-auto border-t border-border/60 bg-transparent" role="contentinfo">
      <div className="container-main py-10">
        <div className="flex flex-col gap-8 border-b border-border/40 pb-8 md:flex-row md:items-start md:justify-between">
          <Link to="/" className={NAV_BRAND_CLASS} aria-label={t('header.home')}>
            <Logo variant="gradient" className={NAV_LOGO_CLASS} />
            <span className={NAV_WORDMARK_CLASS}>
              {t('footer.brand', 'OffMeta')}
            </span>
          </Link>

          <div className="grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 md:gap-x-14">
            <FooterColumn title={t('footer.explore', 'Explore')}>
              {EXPLORE_LINKS.map((link) => (
                <li key={link.to}>
                  <FooterLink to={link.to}>{t(link.labelKey, link.fallback)}</FooterLink>
                </li>
              ))}
            </FooterColumn>

            <FooterColumn title={t('footer.guides')}>
              {GUIDES.slice(0, MAX_MOBILE_GUIDES).map((guide) => (
                <li key={guide.slug}>
                  <FooterLink to={`/guides/${guide.slug}`}>
                    {t(`guide.title.${guide.slug}`, guide.title)}
                  </FooterLink>
                </li>
              ))}
              {GUIDES.length > MAX_MOBILE_GUIDES && (
                <li>
                  <FooterLink to="/guides">{t('footer.allGuides', 'All guides →')}</FooterLink>
                </li>
              )}
            </FooterColumn>

            <FooterColumn title={t('footer.dataSources', 'Data Sources')}>
              {DATA_SOURCES.map((source) => (
                <li key={source.name}>
                  <ExternalAnchor href={source.href}>{source.name}</ExternalAnchor>
                </li>
              ))}
            </FooterColumn>

            <FooterColumn title={t('footer.partners', 'Partners')}>
              {PARTNERS.map((partner) => (
                <li key={partner.name}>
                  <ExternalAnchor href={partner.href}>{partner.name}</ExternalAnchor>
                </li>
              ))}
            </FooterColumn>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-b border-border/40 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className={`flex items-center ${NAV_LINK_GAP_CLASS}`}>
            <a
              href="https://discord.gg/9UEv6vrTD4"
              target="_blank"
              rel="noopener noreferrer"
              className={SOCIAL_LINK_CLASS}
              aria-label={t('footer.discordLabel', 'Join our Discord community (opens in new tab)')}
            >
              <svg className="h-3.5 w-3.5" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
              </svg>
              {t('footer.discord')}
            </a>
            <a
              href="https://github.com/vermosi/offmeta"
              target="_blank"
              rel="noopener noreferrer"
              className={SOCIAL_LINK_CLASS}
              aria-label={t('footer.githubLabel', 'View source on GitHub (opens in new tab)')}
            >
              <svg className="h-3.5 w-3.5" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.865 8.37 6.839 9.72.5.09.683-.22.683-.49 0-.24-.01-1.04-.015-1.89-2.782.62-3.369-1.21-3.369-1.21-.455-1.18-1.11-1.49-1.11-1.49-.907-.64.069-.63.069-.63 1.003.07 1.531 1.05 1.531 1.05.89 1.56 2.336 1.11 2.904.85.09-.66.35-1.11.635-1.36-2.22-.26-4.555-1.14-4.555-5.08 0-1.12.39-2.03 1.029-2.75-.103-.26-.446-1.31.098-2.73 0 0 .84-.27 2.75 1.05A9.31 9.31 0 0 1 12 6.84c.85.004 1.705.12 2.505.35 1.91-1.32 2.75-1.05 2.75-1.05.544 1.42.201 2.47.098 2.73.64.72 1.028 1.63 1.028 2.75 0 3.95-2.34 4.82-4.566 5.08.359.32.679.94.679 1.89 0 1.36-.012 2.46-.012 2.79 0 .27.18.58.688.48A10.25 10.25 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z"/>
              </svg>
              {t('footer.source')}
            </a>
          </div>

          <span className={NAV_EYEBROW_CLASS}>
            © {new Date().getFullYear()} OffMeta
          </span>
        </div>

        <p className="pt-5 text-[10px] leading-relaxed text-muted-foreground">
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
    </footer>
  );
}
