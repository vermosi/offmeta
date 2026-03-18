/**
 * Discovery content shown on the home page before search:
 * Recent Searches, Curated Searches, Features Showcase, Daily Pick,
 * Trending Cards, How It Works, FAQ.
 *
 * NOTE: TrendingSearches is shown above the fold in Index.tsx,
 * so it is intentionally NOT included here to avoid duplication.
 */

import { DailyPick } from '@/components/DailyPick';
import { FeaturesShowcase } from '@/components/FeaturesShowcase';
import { HowItWorksSection } from '@/components/HowItWorksSection';
import { FAQSection } from '@/components/FAQSection';
import { RecentSearches } from '@/components/RecentSearches';
import { TrendingCardsWidget } from '@/components/TrendingCardsWidget';
import { CuratedSearchesWidget } from '@/components/CuratedSearchesWidget';

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
      <div id="faq">
        <FAQSection />
      </div>
    </div>
  );
}
