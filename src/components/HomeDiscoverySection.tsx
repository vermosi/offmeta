/**
 * Discovery content shown on the home page before search:
 * Recent Searches, Daily Pick, Staples, How It Works, FAQ.
 */

import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { DailyPick } from '@/components/DailyPick';
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
      <div className="container-main">
        <StaplesSection onSearch={onSearch} />
      </div>
      <div className="container-main">
        <Link
          to="/archetypes"
          className="flex items-center justify-center gap-2 w-full max-w-2xl mx-auto rounded-xl border border-border/50 bg-card/50 p-4 hover:bg-card hover:border-border transition-all group"
        >
          <Compass className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
            Explore Commander Archetypes
          </span>
          <span className="text-xs text-muted-foreground">→</span>
        </Link>
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
