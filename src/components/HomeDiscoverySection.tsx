/**
 * Discovery content shown on the home page before search.
 * Stripped down to just recent searches for returning users.
 */

import { RecentSearches } from '@/components/RecentSearches';

interface HomeDiscoverySectionProps {
  onSearch: (query: string) => void;
}

export function HomeDiscoverySection({ onSearch }: HomeDiscoverySectionProps) {
  return (
    <div className="container-main">
      <RecentSearches onSearch={onSearch} />
    </div>
  );
}
