/**
 * /mtg/:color/:topic — colour + role pages. Only combinations where the
 * colour genuinely changes the answer are declared here.
 */

import type { LandingPageConfig } from '../types';

export const COLOR_ROLE_PAGES: LandingPageConfig[] = [
  {
    path: '/mtg/red/card-draw',
    family: 'color-role',
    indexable: true,
    indexTrail: ['RED', 'CARD DRAW'],
    title: 'Red card draw MTG — impulse, wheels and combat advantage',
    description:
      'Red card advantage is impulse draw, wheels, looting and combat triggers. Search red card draw by the shape your deck can actually use.',
    headline: 'RED CARD DRAW',
    headlineEmphasis: 'isn’t one thing.',
    lede: 'Impulse draw. Wheels. Combat triggers. Discard-and-draw. Treasure conversion. What does your deck need?',
    searchQuery: 'repeatable red card draw',
    intentPaths: [
      {
        label: 'Impulse draw',
        description: 'Play cards from exile.',
        query: 'red cards that exile cards you may play this turn',
      },
      {
        label: 'Wheels',
        description: 'Replace everyone’s hand.',
        query: 'each player discards their hand and draws seven cards',
      },
      {
        label: 'Combat',
        description: 'Turn aggression into cards.',
        query: 'red cards that draw when creatures deal combat damage',
      },
      {
        label: 'Looting',
        description: 'Trade unwanted cards for new ones.',
        query: 'red cards that let me discard then draw',
      },
      {
        label: 'Permanent-based',
        description: 'Keep generating advantage over time.',
        query: 'red enchantments that give repeatable card advantage',
      },
    ],
    representativeQuery: 'c:r (o:"exile the top" or o:"you may play") -t:land',
    explanation: {
      title: 'About / red card draw',
      paragraphs: [
        'Red approaches card advantage differently than blue. Rather than simply drawing cards, many red effects temporarily exile cards for you to play, replace hands through wheel effects, or reward attacking and dealing damage.',
        'That is why searching only for red cards containing "draw" misses a large part of the colour’s real card advantage. Describing the mechanism — impulse, wheel, loot, combat trigger — finds the cards the keyword hides.',
      ],
    },
    relatedSearches: [
      'red impulse draw that lasts more than one turn',
      'wheels that punish opponents for drawing',
      'red card draw under $2',
    ],
    relatedPages: [
      { label: 'All card draw', href: '/mtg/card-draw' },
      { label: 'White card draw', href: '/mtg/white/card-draw' },
      { label: 'Red ramp', href: '/mtg/red/ramp' },
      { label: 'Commander card draw', href: '/commander/card-draw' },
    ],
    breadcrumbLabel: 'Red card draw',
  },
  {
    path: '/mtg/white/card-draw',
    family: 'color-role',
    indexable: true,
    indexTrail: ['WHITE', 'CARD DRAW'],
    title: 'White card draw MTG — modern white card advantage',
    description:
      'White card draw has changed: attack triggers, wide-board payoffs, symmetric draw and per-turn extra cards. Search it by mechanism.',
    headline: 'WHITE DRAWS',
    headlineEmphasis: 'differently now.',
    lede: 'Attack triggers, go-wide payoffs and symmetric draw did most of the work here.',
    searchQuery: 'white enchantments that draw cards each turn',
    intentPaths: [
      {
        label: 'Go wide',
        description: 'Draw based on creature count.',
        query: 'white cards that draw based on how many creatures I control',
      },
      {
        label: 'Attack triggers',
        description: 'Advantage from combat.',
        query: 'white cards that draw when creatures attack',
      },
      {
        label: 'Symmetric',
        description: 'Everyone draws, you benefit more.',
        query: 'each player draws an additional card',
      },
      {
        label: 'Extra card per turn',
        description: 'Slow but relentless.',
        query: 'white permanents that let me play an extra card each turn',
      },
      {
        label: 'Budget',
        description: 'Cheap white draw engines.',
        query: 'white card draw under $2',
      },
    ],
    representativeQuery: 'c:w o:"draw" (t:enchantment or t:artifact) -t:land',
    explanation: {
      title: 'About / white card draw',
      paragraphs: [
        'White historically paid for card advantage with symmetry or a board-state requirement. Recent design added enchantments and artifacts that convert attacks, tokens or life loss into cards.',
        'A plain "white draw" search buries those under one-shot effects, so it helps to describe the condition attached to the draw rather than the draw itself.',
      ],
    },
    relatedSearches: [
      'white draw that does not need creatures',
      'white card advantage for commander',
      'symmetric draw that helps me most',
    ],
    relatedPages: [
      { label: 'All card draw', href: '/mtg/card-draw' },
      { label: 'Red card draw', href: '/mtg/red/card-draw' },
      { label: 'Commander card draw', href: '/commander/card-draw' },
    ],
    breadcrumbLabel: 'White card draw',
  },
  {
    path: '/mtg/black/ramp',
    family: 'color-role',
    indexable: true,
    indexTrail: ['BLACK', 'RAMP'],
    title: 'Black ramp MTG — rituals, life payment and swamp fetch',
    description:
      'Black ramp trades life and cards for speed: rituals, swamp-based mana, cost reduction and creature acceleration. Search it by mechanism.',
    headline: 'BLACK PAYS',
    headlineEmphasis: 'for its mana.',
    lede: 'Life, cards or symmetry. Black ramp always trades something — pick which.',
    searchQuery: 'black ramp that does not cost life',
    intentPaths: [
      {
        label: 'Rituals',
        description: 'One explosive turn.',
        query: 'black rituals that add a burst of mana',
      },
      {
        label: 'Swamp fetch',
        description: 'Land-based acceleration.',
        query: 'search your library for a swamp and put it onto the battlefield',
      },
      {
        label: 'Life payment',
        description: 'Trade life total for speed.',
        query: 'add mana by paying life',
      },
      {
        label: 'Creature ramp',
        description: 'Mana attached to a body.',
        query: 'black creatures that add mana',
      },
      {
        label: 'Cost reduction',
        description: 'Cheaper spells instead of more mana.',
        query: 'black permanents that make my spells cost less',
      },
    ],
    representativeQuery: 'c:b o:"add" o:"mana" -t:land',
    explanation: {
      title: 'About / black ramp',
      paragraphs: [
        'Black rarely ramps by putting lands onto the battlefield. Instead it converts other resources — life, cards, creatures — into mana, which makes the choice a question of what your deck can afford to spend.',
        'Because those effects are phrased so differently, describing the resource you are willing to trade is a faster route than assembling the oracle conditions yourself.',
      ],
    },
    relatedSearches: [
      'ramp that also fills my graveyard',
      'black mana doubling effects',
      'cheap black rituals for commander',
    ],
    relatedPages: [
      { label: 'All ramp', href: '/mtg/ramp' },
      { label: 'Red ramp', href: '/mtg/red/ramp' },
      { label: 'Commander ramp', href: '/commander/ramp' },
    ],
    breadcrumbLabel: 'Black ramp',
  },
  {
    path: '/mtg/red/ramp',
    family: 'color-role',
    indexable: true,
    indexTrail: ['RED', 'RAMP'],
    title: 'Red ramp MTG — rituals, Treasure and temporary mana',
    description:
      'Red ramp is mostly temporary: rituals, Treasure generation, mana doubling and land sacrifice. Search red acceleration by how long it lasts.',
    headline: 'RED RAMP IS',
    headlineEmphasis: 'usually temporary.',
    lede: 'Rituals and Treasure buy a turn. Doubling and land fetch buy a game.',
    searchQuery: 'red ramp that lasts more than one turn',
    intentPaths: [
      {
        label: 'Treasure',
        description: 'Flexible, one-shot, colour-fixing.',
        query: 'red cards that create treasure tokens',
      },
      {
        label: 'Rituals',
        description: 'A burst of mana right now.',
        query: 'red rituals that add mana',
      },
      {
        label: 'Doubling',
        description: 'Permanent mana multiplication.',
        query: 'permanents that double my red mana',
      },
      {
        label: 'Land fetch',
        description: 'Rare but real in red.',
        query: 'red cards that put lands onto the battlefield',
      },
      {
        label: 'Cost reduction',
        description: 'Make the spells cheaper instead.',
        query: 'red permanents that reduce spell costs',
      },
    ],
    representativeQuery: 'c:r (o:"treasure token" or o:"add {r}") -t:land',
    explanation: {
      title: 'About / red ramp',
      paragraphs: [
        'Red gets mana in bursts. That is excellent for a deck built to spend everything on one turn and poor for a deck that wants to grind, so the useful distinction is duration rather than quantity.',
        'Treasure blurred that line by making red acceleration storable and colour-fixing, which is why Treasure-specific searches often return better results than generic "ramp".',
      ],
    },
    relatedSearches: [
      'permanent red mana acceleration',
      'treasure payoffs in red',
      'ritual effects for storm turns',
    ],
    relatedPages: [
      { label: 'All ramp', href: '/mtg/ramp' },
      { label: 'Black ramp', href: '/mtg/black/ramp' },
      { label: 'Treasure hate', href: '/mtg/treasure-hate' },
    ],
    breadcrumbLabel: 'Red ramp',
  },
  {
    path: '/mtg/green/removal',
    family: 'color-role',
    indexable: true,
    indexTrail: ['GREEN', 'REMOVAL'],
    title: 'Green removal MTG — fight, bite and naturalize effects',
    description:
      'Green removal works through fight, bite, artifact and enchantment destruction, and flying answers. Search green answers by target and method.',
    headline: 'GREEN ANSWERS',
    headlineEmphasis: 'on its own terms.',
    lede: 'Fight, bite, naturalize, and the colour’s one reliable answer to fliers.',
    searchQuery: 'green removal that does not need a creature',
    intentPaths: [
      {
        label: 'Fight',
        description: 'Use your creature as the removal.',
        query: 'green cards that make my creature fight another creature',
      },
      {
        label: 'Bite',
        description: 'Damage without taking any back.',
        query: 'green cards that deal damage equal to power without fighting',
      },
      {
        label: 'Naturalize',
        description: 'Artifacts and enchantments.',
        query: 'green instants that destroy artifacts or enchantments',
      },
      {
        label: 'Fliers',
        description: 'Green’s classic blind spot.',
        query: 'green cards that destroy creatures with flying',
      },
      {
        label: 'Repeatable',
        description: 'Removal that stays on board.',
        query: 'green permanents with repeatable fight abilities',
      },
    ],
    representativeQuery: 'c:g (o:"fights" or o:"destroy target artifact")',
    explanation: {
      title: 'About / green removal',
      paragraphs: [
        'Green does not destroy creatures directly very often. It removes them by fighting, by dealing damage equal to power, or by not answering them at all and going over the top instead.',
        'That makes "green removal" a poor keyword and a good description: the effective search names the method and whether your creature has to survive it.',
      ],
    },
    relatedSearches: [
      'green removal that does not risk my creature',
      'green enchantment removal at instant speed',
      'green answers to flying commanders',
    ],
    relatedPages: [
      { label: 'All removal', href: '/mtg/removal' },
      { label: 'Commander removal', href: '/commander/removal' },
      { label: 'Board wipes', href: '/mtg/board-wipes' },
    ],
    breadcrumbLabel: 'Green removal',
  },
];
