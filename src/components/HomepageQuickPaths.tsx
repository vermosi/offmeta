/**
 * HomepageQuickPaths — editorial band of entry points into OffMeta.
 * Typography and hairline rules only: no cards, pills, or shadows.
 */
import { Link } from 'react-router-dom';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useTranslation } from '@/lib/i18n';

const QUICK_PATHS = [
  {
    href: '/search/commander%20ramp',
    index: '01',
    title: 'Start with a search',
    description: 'Turn a deck idea into real cards and refinements.',
  },
  {
    href: '/guides/cards-like-x',
    index: '02',
    title: 'Cards like X',
    description: 'Find close substitutes for staples and favorite effects.',
  },
] as const;

export function HomepageQuickPaths() {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();

  return (
    <section className="border-t border-border/50 py-10 sm:py-14">
      <div className="container-main">
        <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-muted-foreground sm:text-[11px]">
          {t('home.quickPathsLabel', 'Good starting points')}
        </p>

        <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:items-start">
          <h2 className="font-display text-2xl font-extrabold uppercase leading-[0.95] tracking-tight text-foreground sm:text-3xl lg:col-span-5">
            {t('home.quickPathsTitle', 'Choose your path into OffMeta')}
          </h2>

          <div className="lg:col-span-7">
            {QUICK_PATHS.map((path) => (
              <Link
                key={path.href}
                to={path.href}
                onClick={() =>
                  trackEvent('quick_path_clicked', {
                    action: path.title,
                    placement: 'homepage_quick_paths',
                    cta: path.href,
                  })
                }
                className="group flex items-baseline gap-5 border-b border-border/50 py-5 transition-colors first:border-t hover:bg-foreground/[0.02]"
              >
                <span className="font-mono text-[10px] tracking-[0.28em] text-muted-foreground/70">
                  {path.index}
                </span>
                <span className="flex-1">
                  <span className="block font-display text-base font-bold uppercase tracking-tight text-foreground">
                    {path.title}
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                    {path.description}
                  </span>
                </span>
                <span
                  className="font-mono text-xs text-muted-foreground transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                >
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
