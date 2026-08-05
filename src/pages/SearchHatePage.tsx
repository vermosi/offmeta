import { Coins, Skull, Wind } from 'lucide-react';
import {
  IntentLandingPage,
  type IntentSearchLink,
} from '@/components/search-intents/IntentLandingPage';

const SEARCHES: readonly IntentSearchLink[] = [
  {
    title: 'Treasure hate',
    query: 'cards that punish treasure decks',
    href: '/search/cards-that-punish-treasure-decks',
    icon: Coins,
  },
  {
    title: 'Graveyard hate',
    query: 'cheap graveyard hate for EDH',
    href: '/search/cheap-graveyard-hate-for-edh',
    icon: Skull,
  },
  {
    title: 'Storm hate',
    query: 'cards that stop storm turns',
    href: '/search/cards-that-stop-storm-turns',
    icon: Wind,
  },
];

export default function SearchHatePage() {
  return (
    <IntentLandingPage
      title="Hate Cards for MTG | OffMeta"
      description="Find hate cards for treasure, graveyard, storm, and other common Commander plans. Start with the problem, then open the search."
      url="https://offmeta.app/search-intents/hate"
      breadcrumbLabel="Hate Cards"
      badgeLabel="Hate cards"
      heading="Shut down the thing your table keeps doing."
      intro="If you already know the problem, hate-card searches are the fastest way to get useful answers. Name the strategy first and OffMeta will turn it into a query you can refine."
      searchSource="intent_hate"
      searches={SEARCHES}
      commonTitle="Common targets"
      commonSections={[
        {
          title: 'Graveyards and recursion',
          description:
            'Look for exile effects and graveyard locks when the table is looping value from the bin.',
        },
        {
          title: 'Treasures and artifacts',
          description:
            'Search for artifact removal and tax effects when mana rocks or treasure engines are running away with the game.',
        },
      ]}
    />
  );
}
