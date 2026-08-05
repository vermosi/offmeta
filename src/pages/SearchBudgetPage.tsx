import { ShieldAlert, Sparkles, Wand2 } from 'lucide-react';
import {
  IntentLandingPage,
  type IntentSearchLink,
} from '@/components/search-intents/IntentLandingPage';

const SEARCHES: readonly IntentSearchLink[] = [
  {
    title: 'Cheap board wipes',
    query: 'budget board wipes under $5',
    href: '/search/budget-board-wipes-under-5',
    icon: ShieldAlert,
  },
  {
    title: 'Budget ramp',
    query: 'cheap ramp spells for commander',
    href: '/search/cheap-ramp-spells-for-commander',
    icon: Wand2,
  },
  {
    title: 'Budget value cards',
    query: 'underplayed commander staples under $2',
    href: '/search/underplayed-commander-staples-under-2',
    icon: Sparkles,
  },
];

export default function SearchBudgetPage() {
  return (
    <IntentLandingPage
      title="Budget MTG Searches | OffMeta"
      description="Find cheap Magic cards by budget, role, and format. Explore board wipes, ramp, and value staples with plain-English searches."
      url="https://offmeta.app/search-intents/budget"
      breadcrumbLabel="Budget Searches"
      badgeLabel="Budget answers"
      heading="Find the best cheap cards for the job you need."
      intro="Budget searches work best when you name the role first. Ask for the effect you want, add a price cap, and OffMeta will turn it into a search you can refine."
      searchSource="intent_budget"
      searches={SEARCHES}
      commonTitle="Why this works"
      commonSections={[
        {
          title: 'Start with the role',
          description:
            'Search for removal, ramp, draw, protection, or hate before you worry about exact card names. The result set gets more useful faster.',
        },
        {
          title: 'Then cap the price',
          description:
            'Adding a simple budget filter narrows the results to cards that are actually buyable for new decks or upgrades.',
        },
      ]}
    />
  );
}
