/**
 * Discovery content shown on the home page before search:
 * Recent Searches, Daily Pick, Features Showcase, Staples, How It Works, FAQ.
 */

import { DailyPick } from '@/components/DailyPick';
import { FeaturesShowcase } from '@/components/FeaturesShowcase';
import { StaplesSection } from '@/components/StaplesSection';
import { HowItWorksSection } from '@/components/HowItWorksSection';
import { FAQSection } from '@/components/FAQSection';
import { RecentSearches } from '@/components/RecentSearches';
import { TrendingCardsWidget } from '@/components/TrendingCardsWidget';
import { SearchCTA } from '@/components/SearchCTA';

interface HomeDiscoverySectionProps {
  onSearch: (query: string) => void;
}

export function HomeDiscoverySection({ onSearch }: HomeDiscoverySectionProps) {
  return (
    <div className="space-y-8 sm:space-y-10 lg:space-y-12">
      <div className="container-main">
        <RecentSearches onSearch={onSearch} />
      </div>
      <FeaturesShowcase />
      <div className="container-main grid grid-cols-1 md:grid-cols-2 gap-6">
        <div id="daily-pick">
          <DailyPick />
        </div>
        <TrendingCardsWidget onSearch={onSearch} />
      </div>
      <div className="container-main">
        <StaplesSection onSearch={onSearch} />
      </div>
      <div id="how-it-works">
        <HowItWorksSection />
      </div>
      <SearchCTA onSearch={() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // Focus the search bar after scroll
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
