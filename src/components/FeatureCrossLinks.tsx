/**
 * Cross-link banner promoting /combos, /deck-recs, and /guides.
 * Shown on search results and card pages to increase feature discovery.
 */

import { Link } from 'react-router-dom';
import { Zap, BookOpen, Search } from 'lucide-react';

interface FeatureCrossLinksProps {
  /** Optional card name to contextualize links */
  cardName?: string;
  /** Compact mode for tighter layouts */
  compact?: boolean;
}

const FEATURES = [
  {
    to: '/',
    icon: Search,
    label: 'Search Cards',
    description: 'Type plain English — get the perfect card',
  },
  {
    to: '/combos',
    icon: Zap,
    label: 'Find Combos',
    description: 'Discover infinite combos for your deck',
  },
  {
    to: '/guides',
    icon: BookOpen,
    label: 'Search Guides',
    description: 'Master MTG card search techniques',
  },
] as const;

export function FeatureCrossLinks({ compact }: FeatureCrossLinksProps) {
  return (
    <nav
      aria-label="Explore more tools"
      className={`rounded-2xl border border-border/60 bg-card/50 ${compact ? 'p-3' : 'p-4 sm:p-5'}`}
    >
      <p className={`font-semibold text-foreground mb-3 ${compact ? 'text-xs' : 'text-sm'}`}>
        Explore more OffMeta tools
      </p>
      <div className={`grid gap-2 ${compact ? 'grid-cols-1 sm:grid-cols-3' : 'sm:grid-cols-3'}`}>
        {FEATURES.map(({ to, icon: Icon, label, description }) => (
          <Link
            key={to}
            to={to}
            className="group flex items-start gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-all duration-200 hover:border-accent/30 hover:bg-accent/5"
          >
            <Icon
              className={`flex-shrink-0 text-accent ${compact ? 'h-4 w-4 mt-0.5' : 'h-5 w-5 mt-0.5'}`}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <span className={`font-medium text-foreground group-hover:text-accent transition-colors ${compact ? 'text-xs' : 'text-sm'}`}>
                {label}
              </span>
              {!compact && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {description}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </nav>
  );
}
