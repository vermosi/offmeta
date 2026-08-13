/**
 * /mtg/:topic — problem/answer pages. Players search for answers to what
 * the table is doing, not for mechanical categories.
 */

import type { LandingPageConfig } from '../types';

export const PROBLEM_PAGES: LandingPageConfig[] = [
  {
    path: '/mtg/treasure-hate',
    family: 'problem',
    indexable: true,
    indexTrail: ['ANSWER INDEX', 'TREASURE'],
    title: 'Treasure hate MTG — cards that punish Treasure decks',
    description:
      'Find cards that actually punish Treasure decks: tax the tokens, punish sacrifice, stop activated abilities, or sweep artifacts asymmetrically.',
    headline: 'FIND CARDS THAT',
    headlineEmphasis: 'punish Treasure.',
    lede: 'Not just cards that happen to destroy artifacts.',
    searchQuery: 'cards that punish treasure decks',
    intentPathsTitle: 'Explore the problem',
    intentPaths: [
      {
        label: 'Stop them being used',
        description: 'Tokens arrive tapped or cannot be sacrificed.',
        query: 'artifacts and tokens enter the battlefield tapped',
      },
      {
        label: 'Punish sacrifice',
        description: 'Make each sacrifice cost them something.',
        query: 'punish opponents for sacrificing artifacts',
      },
      {
        label: 'Punish creation',
        description: 'Tax the token generation itself.',
        query: 'hurt opponents for creating artifact tokens',
      },
      {
        label: 'Remove them',
        description: 'Asymmetric artifact sweepers.',
        query: 'destroy all artifacts except mine',
      },
      {
        label: 'Shut them off',
        description: 'Turn off activated abilities entirely.',
        query: 'stop activated abilities of artifacts',
      },
    ],
    representativeQuery: 'o:"artifact" (o:"can\'t" or o:"loses life") -t:land',
    explanation: {
      title: 'About / treasure hate',
      paragraphs: [
        'Treasure decks do not lose to artifact removal, because the artifacts are free and replaceable. They lose to effects that tax the creation, punish the sacrifice, or switch off activated abilities.',
        'Searching Scryfall for "treasure" returns mostly cards that make Treasures. The answer cards rarely mention the word at all, which is precisely why intent-first search finds them and keyword search does not.',
      ],
    },
    relatedSearches: [
      'stop opponents from sacrificing permanents',
      'tax effects for artifact tokens',
      'asymmetric artifact board wipes',
    ],
    relatedPages: [
      { label: 'Artifact hate', href: '/mtg/artifact-hate' },
      { label: 'Graveyard hate', href: '/mtg/graveyard-hate' },
      { label: 'Board wipes', href: '/mtg/board-wipes' },
    ],
    breadcrumbLabel: 'Treasure hate',
  },
  {
    path: '/mtg/graveyard-hate',
    family: 'problem',
    indexable: true,
    indexTrail: ['ANSWER INDEX', 'GRAVEYARD'],
    title: 'Graveyard hate MTG — stop recursion and reanimation',
    description:
      'Find graveyard hate that fits your deck: instant-speed exile, permanent replacement effects, one-sided sweeps and cheap colourless options.',
    headline: 'SHUT DOWN THE',
    headlineEmphasis: 'graveyard.',
    lede: 'Timing matters more than the effect. Decide whether you need a response or a lock.',
    searchQuery: 'cheap graveyard hate for commander',
    intentPathsTitle: 'Explore the problem',
    intentPaths: [
      {
        label: 'Instant response',
        description: 'Exile in response to reanimation.',
        query: 'instant speed graveyard exile',
      },
      {
        label: 'Static lock',
        description: 'Cards never reach the graveyard at all.',
        query: 'permanents that exile cards instead of putting them in graveyards',
      },
      {
        label: 'One-sided',
        description: 'Keep your own graveyard intact.',
        query: 'exile opponents graveyards but not mine',
      },
      {
        label: 'Colourless',
        description: 'Fits any deck.',
        query: 'colorless artifacts that hate on graveyards',
      },
      {
        label: 'Punishing',
        description: 'Drain them for using it.',
        query: 'punish opponents for casting spells from their graveyard',
      },
    ],
    representativeQuery: 'o:"exile" o:"graveyard" (t:artifact or t:enchantment)',
    explanation: {
      title: 'About / graveyard hate',
      paragraphs: [
        'A reanimator deck usually only needs one window. Sorcery-speed graveyard removal often arrives after that window has closed, which is why instant-speed and static effects are worth more than raw efficiency here.',
        'The trade-off is symmetry: many of the cheapest options hit your own graveyard too, so name that constraint in the search rather than filtering it by hand afterwards.',
      ],
    },
    relatedSearches: [
      'graveyard hate that replaces itself',
      'stop reanimation spells',
      'exile a single card from a graveyard at instant speed',
    ],
    relatedPages: [
      { label: 'Recursion', href: '/mtg/recursion' },
      { label: 'Treasure hate', href: '/mtg/treasure-hate' },
      { label: 'Commander removal', href: '/commander/removal' },
    ],
    breadcrumbLabel: 'Graveyard hate',
  },
  {
    path: '/mtg/artifact-hate',
    family: 'problem',
    indexable: true,
    indexTrail: ['ANSWER INDEX', 'ARTIFACTS'],
    title: 'Artifact hate MTG — answers for rocks, equipment and combos',
    description:
      'Find artifact hate by target: single-target exile, repeatable answers, mass destruction, and effects that switch artifacts off entirely.',
    headline: 'ANSWER THE',
    headlineEmphasis: 'artifacts.',
    lede: 'Mana rocks, equipment and combo pieces need different answers. Say which one.',
    searchQuery: 'artifact hate that hits combo pieces',
    intentPathsTitle: 'Explore the problem',
    intentPaths: [
      {
        label: 'Single target',
        description: 'Cheap, clean, instant speed.',
        query: 'cheap instants that exile an artifact',
      },
      {
        label: 'Repeatable',
        description: 'A permanent that keeps answering.',
        query: 'permanents with repeatable artifact removal',
      },
      {
        label: 'Mass',
        description: 'Sweep the whole class.',
        query: 'destroy all artifacts',
      },
      {
        label: 'Switch off',
        description: 'Stop abilities without removing anything.',
        query: 'artifacts abilities do not function',
      },
      {
        label: 'Tax',
        description: 'Make artifacts expensive to use.',
        query: 'make artifact spells and abilities cost more',
      },
    ],
    representativeQuery: '(o:"destroy target artifact" or o:"exile target artifact") mv<=3',
    explanation: {
      title: 'About / artifact hate',
      paragraphs: [
        'Artifact decks fail in different ways. A mana base of rocks folds to a sweeper; an equipment deck folds to targeted exile; a combo deck folds to a static effect that turns abilities off before the loop starts.',
        'Describing which of those you are up against produces a much smaller and more useful set of results than the blanket category.',
      ],
    },
    relatedSearches: [
      'stop artifact activated abilities',
      'artifact removal that draws a card',
      'one sided artifact sweepers',
    ],
    relatedPages: [
      { label: 'Treasure hate', href: '/mtg/treasure-hate' },
      { label: 'Removal', href: '/mtg/removal' },
      { label: 'Board wipes', href: '/mtg/board-wipes' },
    ],
    breadcrumbLabel: 'Artifact hate',
  },
  {
    path: '/mtg/token-hate',
    family: 'problem',
    indexable: true,
    indexTrail: ['ANSWER INDEX', 'TOKENS'],
    title: 'Token hate MTG — answers for go-wide token decks',
    description:
      'Find token hate: replacement effects that stop tokens being created, sweepers that scale, and punishment for going wide.',
    headline: 'STOP THEM',
    headlineEmphasis: 'going wide.',
    lede: 'Killing tokens is easy. Stopping them from existing is better.',
    searchQuery: 'cards that stop opponents from making tokens',
    intentPathsTitle: 'Explore the problem',
    intentPaths: [
      {
        label: 'Prevent creation',
        description: 'Replacement effects, not removal.',
        query: 'tokens are not created',
      },
      {
        label: 'Sweep',
        description: 'Cheap mass removal that scales.',
        query: 'destroy all creatures with power two or less',
      },
      {
        label: 'Punish attacks',
        description: 'Make swarming expensive.',
        query: 'punish opponents for attacking with multiple creatures',
      },
      {
        label: 'Tax',
        description: 'Limit how many spells or attacks they get.',
        query: 'opponents can only attack with one creature each combat',
      },
      {
        label: 'Blockers',
        description: 'Stabilise instead of answering.',
        query: 'creatures that block multiple attackers',
      },
    ],
    representativeQuery: 'o:"token" o:"can\'t" -t:land',
    explanation: {
      title: 'About / token hate',
      paragraphs: [
        'Token decks convert small effects into board presence faster than one-for-one removal can respond. The answers that matter are replacement effects, scalable sweepers and combat taxes.',
        'None of those consistently use the word "token", so describing the outcome finds cards that a keyword search will not surface.',
      ],
    },
    relatedSearches: [
      'cheap sweepers for small creatures',
      'stop creature tokens entering the battlefield',
      'punish opponents for casting creature spells',
    ],
    relatedPages: [
      { label: 'Board wipes', href: '/mtg/board-wipes' },
      { label: 'Treasure hate', href: '/mtg/treasure-hate' },
      { label: 'Removal', href: '/mtg/removal' },
    ],
    breadcrumbLabel: 'Token hate',
  },
  {
    path: '/mtg/lifegain-hate',
    family: 'problem',
    indexable: true,
    indexTrail: ['ANSWER INDEX', 'LIFEGAIN'],
    title: 'Lifegain hate MTG — stop opponents gaining life',
    description:
      'Find lifegain hate: static effects that prevent life gain, punishment for gaining life, and ways to close the game through a big life total.',
    headline: 'MAKE LIFE',
    headlineEmphasis: 'stop mattering.',
    lede: 'Racing a lifegain deck rarely works. Prevention and alternate win routes do.',
    searchQuery: 'cards that stop opponents from gaining life',
    intentPathsTitle: 'Explore the problem',
    intentPaths: [
      {
        label: 'Prevent',
        description: 'Players simply cannot gain life.',
        query: 'players cannot gain life',
      },
      {
        label: 'Punish',
        description: 'Turn their gain into a cost.',
        query: 'punish opponents for gaining life',
      },
      {
        label: 'Drain',
        description: 'Lose life without combat.',
        query: 'repeatable drain effects that ignore blockers',
      },
      {
        label: 'Alternate win',
        description: 'Skip the life total entirely.',
        query: 'cards that win the game without dealing damage',
      },
      {
        label: 'Combat tax',
        description: 'Stop the lifelink engine.',
        query: 'prevent damage from being dealt by creatures with lifelink',
      },
    ],
    representativeQuery: 'o:"can\'t gain life"',
    explanation: {
      title: 'About / lifegain hate',
      paragraphs: [
        'Lifegain is only a problem when the deck converts it into inevitability. Answering it means removing the conversion — either by preventing the gain outright or by winning through a route that does not care about the number.',
        'These effects appear on cards in five different colours with almost no shared vocabulary, so the category is far easier to describe than to query.',
      ],
    },
    relatedSearches: [
      'drain opponents each upkeep',
      'punish players for gaining life in commander',
      'alternate win conditions in black',
    ],
    relatedPages: [
      { label: 'Removal', href: '/mtg/removal' },
      { label: 'Token hate', href: '/mtg/token-hate' },
      { label: 'Commander win conditions', href: '/commander/board-wipes' },
    ],
    breadcrumbLabel: 'Lifegain hate',
  },
];
