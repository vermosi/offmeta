/**
 * Accessible skip navigation links.
 * Renders visually-hidden links that become visible on focus,
 * allowing keyboard users to jump to main content or search.
 */

import { useTranslation } from '@/lib/i18n/useTranslation';

interface SkipLinksProps {
  /** Show "Skip to search" link (only on pages with a search input) */
  showSearchLink?: boolean;
}

export function SkipLinks({ showSearchLink = false }: SkipLinksProps) {
  const { t } = useTranslation();

  return (
    <nav aria-label="Skip links" className="contents">
      <a href="#main-content" className="skip-link">
        {t('a11y.skipToContent')}
      </a>
      {showSearchLink && (
        <a
          href="#search-input"
          className="skip-link"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById('search-input')?.focus();
          }}
        >
          {t('a11y.skipToSearch')}
        </a>
      )}
    </nav>
  );
}
