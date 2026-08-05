import { Sparkles, ShieldAlert, Wand2 } from 'lucide-react';
import {
  IntentLandingPage,
  type IntentSearchLink,
} from '@/components/search-intents/IntentLandingPage';

const SEARCHES: readonly IntentSearchLink[] = [
  {
    title: 'More like Seedborn Muse',
    query: 'cards similar to Seedborn Muse',
    href: '/search/cards-similar-to-seedborn-muse',
    icon: Sparkles,
  },
  {
    title: 'Upgrades for a staple',
    query: 'better versions of commander staple cards',
    href: '/search/better-versions-of-commander-staple-cards',
    icon: Wand2,
  },
  {
    title: 'Similar hate cards',
    query: 'similar cards to rest in peace',
    href: '/search/similar-cards-to-rest-in-peace',
    icon: ShieldAlert,
  },
];

export default function SearchSimilarPage() {
  return (
    <IntentLandingPage
      title="Cards Like X | OffMeta"
      description="Find cards similar to a known card, plus upgrades and close substitutes. Start from one card and let OffMeta widen the search."
      url="https://offmeta.app/search-intents/similar"
      breadcrumbLabel="Cards Like X"
      badgeLabel="Similar cards"
      heading="Start from one card and find the closest useful replacements."
      intro="When you already know a card that works, the fastest next step is to ask for similar cards, upgrades, or nearby effects. OffMeta can widen that search without making you rebuild the query from scratch."
      searchSource="intent_similar"
      searches={SEARCHES}
      commonTitle="Best when you know"
      commonSections={[
        {
          title: 'The exact card name',
          description:
            'This is ideal when a specific card is already doing the job and you want similar options or a stronger version.',
        },
        {
          title: 'The effect you want',
          description:
            'Similar-card search works best when you pair the reference card with the effect, like ramp, draw, recursion, or protection.',
        },
      ]}
    />
  );
}
