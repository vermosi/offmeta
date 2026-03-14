/**
 * Discovery content shown on the home page before search:
 * Trending Searches, Recent Searches, Daily Pick, Features Showcase, How It Works, FAQ.
 */

import { DailyPick } from '@/components/DailyPick';
import { FeaturesShowcase } from '@/components/FeaturesShowcase';
import { HowItWorksSection } from '@/components/HowItWorksSection';
import { FAQSection } from '@/components/FAQSection';
import { RecentSearches } from '@/components/RecentSearches';
import { TrendingSearches } from '@/components/TrendingSearches';
import { TrendingCardsWidget } from '@/components/TrendingCardsWidget';
import { SearchCTA } from '@/components/SearchCTA';
import { CuratedSearchesWidget } from '@/components/CuratedSearchesWidget';

const SEARCH_HISTORY_KEY = 'offmeta_search_history';

interface HomeDiscoverySectionProps {
  onSearch: (query: string) => void;
}

export function HomeDiscoverySection({ onSearch }: HomeDiscoverySectionProps) {
  const hasHistory = (() => {
    try {
      const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
      return stored ? JSON.parse(stored).length > 0 : false;
    } catch { return false; }
  })();

  return (
    <div className="space-y-8 sm:space-y-10 lg:space-y-12">
      <div className="container-main space-y-6">
        <TrendingSearches onSearch={onSearch} hasHistory={hasHistory} />
        <RecentSearches onSearch={onSearch} />
        <CuratedSearchesWidget />
      </div>
      <FeaturesShowcase />
      <div className="container-main grid grid-cols-1 md:grid-cols-2 gap-6">
        <div id="daily-pick">
          <DailyPick />
        </div>
        <TrendingCardsWidget onSearch={onSearch} />
      </div>
      <div id="how-it-works">
        <HowItWorksSection />
      </div>
      <SearchCTA onSearch={() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => {
          const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]');
          searchInput?.focus();
        }, 400);
      }} />
      <div id="faq">
        <FAQSection />
      </div>
    </div>
  );
}
