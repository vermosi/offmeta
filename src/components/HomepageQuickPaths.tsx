import {
  ArrowRight,
  BookOpen,
  Sparkles,
  Search,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from '@/lib/i18n';

const QUICK_PATHS = [
  {
    href: '/search/commander%20ramp',
    icon: Search,
    title: 'Start with a search',
    description: 'Turn a deck idea into real cards and refinements.',
  },
  {
    href: '/guides',
    icon: BookOpen,
    title: 'Learn the basics',
    description: 'Browse focused guides and syntax examples.',
  },
  {
    href: '/combos',
    icon: Sparkles,
    title: 'Find combos',
    description: 'Discover infinite and synergy combos for your cards.',
  },
  {
    href: '/market',
    icon: TrendingUp,
    title: 'Track prices',
    description: 'See market movers and card trends at a glance.',
  },
] as const;

export function HomepageQuickPaths() {
  const { t } = useTranslation();

  return (
    <section className="container-main pb-10 sm:pb-14">
      <div className="rounded-3xl border border-border/70 bg-card/50 backdrop-blur-sm p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {t('home.quickPathsLabel', 'Good starting points')}
            </p>
            <h2 className="mt-1 text-base sm:text-lg font-semibold text-foreground">
              {t('home.quickPathsTitle', 'Choose your path into OffMeta')}
            </h2>
          </div>
          <p className="text-xs text-muted-foreground max-w-xl">
            {t(
              'home.quickPathsDesc',
              'Each route is designed to help a different kind of Magic player move from curiosity to action.',
            )}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {QUICK_PATHS.map((path) => {
            const Icon = path.icon;
            return (
              <Link
                key={path.href}
                to={path.href}
                className="group rounded-2xl border border-border/70 bg-background/70 p-4 transition-colors hover:border-primary/40 hover:bg-card/80"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        {path.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {path.description}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
