/**
 * Discovery content shown on the home page after the primary hero/search flow.
 * Curated searches stay closest to activation, while recent searches and FAQ
 * move lower so the search CTA stays dominant for first-time visitors.
 */

import { RecentSearches } from '@/components/RecentSearches';
import { CuratedSearchesWidget } from '@/components/CuratedSearchesWidget';
import { FAQSection } from '@/components/FAQSection';

interface HomeDiscoverySectionProps {
  onSearch: (query: string) => void;
}

export function HomeDiscoverySection({ onSearch }: HomeDiscoverySectionProps) {
  return (
    <div className="space-y-10 sm:space-y-12 lg:space-y-14 pt-4 sm:pt-6">
      <div className="container-main space-y-8">
        <CuratedSearchesWidget />
        <RecentSearches onSearch={onSearch} />
      </div>
      <div id="faq">
        <FAQSection />
      </div>
    </div>
  );
}
