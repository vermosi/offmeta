/**
 * SunsetBanner — non-blocking notice shown on deprecated feature pages.
 * Tells visitors the feature is being de-prioritized and points them to
 * the core natural-language search experience.
 */

import { Link } from 'react-router-dom';
import { AlertTriangle, Search } from 'lucide-react';

interface SunsetBannerProps {
  /** Short label for the feature, e.g. "Market Trends" */
  feature: string;
}

export function SunsetBanner({ feature }: SunsetBannerProps) {
  return (
    <div
      role="status"
      className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex items-start gap-3 text-sm"
    >
      <AlertTriangle
        className="h-4 w-4 mt-0.5 shrink-0 text-amber-500"
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0 space-y-1">
        <p className="font-medium text-foreground">
          {feature} is being de-prioritized
        </p>
        <p className="text-muted-foreground text-xs leading-relaxed">
          We're focusing OffMeta on its core: natural-language card search.
          This page still works, but we recommend trying our search instead.
        </p>
      </div>
      <Link
        to="/"
        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
      >
        <Search className="h-3.5 w-3.5" aria-hidden="true" />
        Search cards
      </Link>
    </div>
  );
}
