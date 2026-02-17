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

interface HomeDiscoverySectionProps {
  onSearch: (query: string) => void;
}

export function HomeDiscoverySection({ onSearch }: HomeDiscoverySectionProps) {
  return (
    <div className="space-y-10 sm:space-y-12 lg:space-y-14">
      <div className="container-main">
        <RecentSearches onSearch={onSearch} />
      </div>
      <div id="daily-pick" className="container-main">
        <DailyPick />
      </div>
      <FeaturesShowcase />
      <div className="container-main">
        <StaplesSection onSearch={onSearch} />
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
