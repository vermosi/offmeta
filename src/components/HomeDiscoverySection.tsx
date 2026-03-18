/**
 * Discovery content shown on the home page before search:
 * Recent Searches, Curated Searches (SEO links), FAQ.
 *
 * Stripped to essentials based on analytics — only components
 * with demonstrated engagement or SEO value are retained.
 */

import { RecentSearches } from '@/components/RecentSearches';
import { CuratedSearchesWidget } from '@/components/CuratedSearchesWidget';
import { FAQSection } from '@/components/FAQSection';

interface HomeDiscoverySectionProps {
  onSearch: (query: string) => void;
}

export function HomeDiscoverySection({ onSearch }: HomeDiscoverySectionProps) {
  return (
    <div className="space-y-8 sm:space-y-10 lg:space-y-12">
      <div className="container-main space-y-6">
        <RecentSearches onSearch={onSearch} />
        <CuratedSearchesWidget />
      </div>
      <div id="faq">
        <FAQSection />
      </div>
    </div>
  );
}
