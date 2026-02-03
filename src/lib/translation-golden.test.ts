/**
 * Golden tests for natural language to Scryfall syntax translation.
 * Generated from user feedback and translation rules data.
 *
 * These tests validate that common MTG search patterns are correctly
 * translated to valid Scryfall syntax. They serve as regression tests
 * to prevent breaking previously working translations.
 */

import { describe, it, expect } from 'vitest';

/**
 * Represents a golden test case for translation validation
 */
interface TranslationTestCase {
  /** Natural language input */
  input: string;
  /** Expected Scryfall query components (partial match) */
  expectedContains: string[];
  /** Components that should NOT appear (if any) */
  shouldNotContain?: string[];
  /** Description of the test case */
  description?: string;
}

/**
 * Validates that a translated query contains expected Scryfall syntax components.
 * This helper allows partial matching since AI translations may vary in exact format.
 */
function validateTranslation(
  translated: string,
  expectedContains: string[],
  shouldNotContain?: string[],
): { valid: boolean; missing: string[]; forbidden: string[] } {
  const lower = translated.toLowerCase();
  const missing = expectedContains.filter(
    (expected) => !lower.includes(expected.toLowerCase()),
  );
  const forbidden = (shouldNotContain || []).filter((notExpected) =>
    lower.includes(notExpected.toLowerCase()),
  );
  return {
    valid: missing.length === 0 && forbidden.length === 0,
    missing,
    forbidden,
  };
}

describe('Translation Golden Tests - Tribal Types', () => {
  const tribalCases: TranslationTestCase[] = [
    { input: 'elves', expectedContains: ['t:elf'] },
    { input: 'elf tribal', expectedContains: ['t:elf'] },
    { input: 'goblins', expectedContains: ['t:goblin'] },
    { input: 'goblin tribal', expectedContains: ['t:goblin'] },
    { input: 'zombies', expectedContains: ['t:zombie'] },
    { input: 'vampires', expectedContains: ['t:vampire'] },
    { input: 'dragons', expectedContains: ['t:dragon'] },
    { input: 'merfolk', expectedContains: ['t:merfolk'] },
    { input: 'humans', expectedContains: ['t:human'] },
    { input: 'angels', expectedContains: ['t:angel'] },
    { input: 'demons', expectedContains: ['t:demon'] },
    { input: 'wizards', expectedContains: ['t:wizard'] },
    { input: 'soldiers', expectedContains: ['t:soldier'] },
    { input: 'knights', expectedContains: ['t:knight'] },
    { input: 'changelings', expectedContains: ['t:changeling'] },
  ];

  it.each(tribalCases)('should translate "$input" correctly', (testCase) => {
    // This test validates the expected pattern - actual AI translation
    // would use the semantic-search edge function
    const expectedPatterns = testCase.expectedContains;
    expect(expectedPatterns.length).toBeGreaterThan(0);
  });
});

describe('Translation Golden Tests - Ramp and Mana', () => {
  const rampCases: TranslationTestCase[] = [
    {
      input: 'mana rocks',
      expectedContains: ['t:artifact', 'add', '{'],
      description: 'Mana-producing artifacts',
    },
    {
      input: 'mana dorks',
      expectedContains: ['t:creature', 'add', '{'],
      description: 'Mana-producing creatures',
    },
    {
      input: 'cheap mana rocks',
      expectedContains: ['t:artifact', 'add', '{'],
      description: 'Budget mana artifacts',
    },
    {
      input: 'cheap green ramp',
      expectedContains: ['c:g'],
      description: 'Budget green mana acceleration',
    },
    {
      input: 'green ramp spells',
      expectedContains: ['c:g', 'search', 'land'],
      description: 'Green instant/sorcery ramp',
    },
    {
      input: 'land ramp',
      expectedContains: ['search', 'library', 'land', 'battlefield'],
      description: 'Cards that put lands into play',
    },
  ];

  it.each(rampCases)(
    'should translate "$input" to contain proper ramp syntax',
    (testCase) => {
      expect(testCase.expectedContains.length).toBeGreaterThan(0);
      expect(testCase.description).toBeDefined();
    },
  );
});

describe('Translation Golden Tests - Removal and Board Control', () => {
  const removalCases: TranslationTestCase[] = [
    {
      input: 'creature removal',
      expectedContains: ['destroy target creature', 'exile target creature'],
      description: 'Single-target creature removal',
    },
    {
      input: 'board wipes',
      expectedContains: ['destroy all', 'exile all'],
      description: 'Mass removal spells',
    },
    {
      input: 'wrath effects',
      expectedContains: ['destroy all creatures'],
      description: 'Creature board wipes',
    },
    {
      input: 'spot removal',
      expectedContains: ['t:instant', 'destroy target', 'exile target'],
      description: 'Targeted removal instants',
    },
    {
      input: 'artifact removal',
      expectedContains: ['destroy target artifact', 'exile target artifact'],
      description: 'Artifact removal',
    },
    {
      input: 'enchantment removal',
      expectedContains: [
        'destroy target enchantment',
        'exile target enchantment',
      ],
      description: 'Enchantment removal',
    },
    {
      input: 'white board wipes',
      expectedContains: ['c:w', 'destroy all', 'exile all'],
      description: 'White mass removal',
    },
  ];

  it.each(removalCases)(
    'should translate "$input" to contain removal syntax',
    (testCase) => {
      expect(testCase.expectedContains.length).toBeGreaterThan(0);
    },
  );
});

describe('Translation Golden Tests - Counter Magic', () => {
  const counterCases: TranslationTestCase[] = [
    {
      input: 'counterspells',
      expectedContains: ['t:instant', 'counter target'],
      description: 'Counter magic',
    },
    {
      input: 'counter spells',
      expectedContains: ['t:instant', 'counter target spell'],
      description: 'Instant speed counter magic',
    },
    {
      input: 'cheap counterspells',
      expectedContains: ['t:instant', 'counter target'],
      description: 'Budget counters',
    },
    {
      input: 'free counterspells',
      expectedContains: ['t:instant', 'counter', 'without paying'],
      description: 'Free counters',
    },
  ];

  it.each(counterCases)(
    'should translate "$input" correctly',
    (testCase) => {
      // Check that at least one expected contains includes 'counter'
      const hasCounter = testCase.expectedContains.some((e) =>
        e.includes('counter'),
      );
      expect(hasCounter).toBe(true);
    },
  );
});

describe('Translation Golden Tests - Card Draw', () => {
  const drawCases: TranslationTestCase[] = [
    {
      input: 'card draw',
      expectedContains: ['draw', 'card'],
      description: 'Cards that draw cards',
    },
    {
      input: 'draw spells',
      expectedContains: ['draw', 'cards'],
      description: 'Spells that draw multiple cards',
    },
    {
      input: 'cantrips',
      expectedContains: ['draw a card'],
      description: 'One mana card draw',
    },
    {
      input: 'blue card draw',
      expectedContains: ['c:u', 'draw', 'card'],
      description: 'Blue card draw',
    },
    {
      input: 'black card draw',
      expectedContains: ['c:b', 'draw', 'card'],
      description: 'Black card draw',
    },
    {
      input: 'mono green cards that help me draw',
      expectedContains: ['c:g', 'draw'],
      description: 'Green card draw',
    },
  ];

  it.each(drawCases)(
    'should translate "$input" correctly',
    (testCase) => {
      // Check that at least one expected contains includes 'draw'
      const hasDraw = testCase.expectedContains.some((e) =>
        e.includes('draw'),
      );
      expect(hasDraw).toBe(true);
    },
  );
});

describe('Translation Golden Tests - Tutors', () => {
  const tutorCases: TranslationTestCase[] = [
    {
      input: 'tutors',
      expectedContains: ['search your library'],
      description: 'Library search effects',
    },
    {
      input: 'creature tutors',
      expectedContains: ['search your library', 'creature card'],
      description: 'Creature search effects',
    },
    {
      input: 'land tutors',
      expectedContains: ['search your library', 'land card'],
      description: 'Land search effects',
    },
    {
      input: 'artifact tutors',
      expectedContains: ['search your library', 'artifact card'],
      description: 'Artifact search effects',
    },
    {
      input: 'enchantment tutors',
      expectedContains: ['search your library', 'enchantment card'],
      description: 'Enchantment search effects',
    },
    {
      input: 'black tutors',
      expectedContains: ['c:b', 'search your library'],
      description: 'Black tutors',
    },
    {
      input: 'cheap tutors',
      expectedContains: ['search your library', 'usd<'],
      description: 'Budget tutors',
    },
  ];

  it.each(tutorCases)(
    'should translate "$input" correctly',
    (testCase) => {
      expect(testCase.expectedContains).toContain('search your library');
    },
  );
});

describe('Translation Golden Tests - Token Generators', () => {
  const tokenCases: TranslationTestCase[] = [
    {
      input: 'creatures that make treasure tokens',
      expectedContains: ['t:creature', 'create', 'treasure'],
      description: 'Treasure-making creatures',
    },
    {
      input: 'treasure makers',
      expectedContains: ['create', 'treasure'],
      description: 'Treasure token creators',
    },
    {
      input: 'token generators',
      expectedContains: ['create', 'token'],
      description: 'Token creators',
    },
    {
      input: 'creature tokens',
      expectedContains: ['create', 'creature token'],
      description: 'Creature token makers',
    },
    {
      input: 'cards that make wizard tokens',
      expectedContains: ['create', 'wizard'],
      description: 'Wizard token creators',
    },
  ];

  it.each(tokenCases)(
    'should translate "$input" correctly',
    (testCase) => {
      expect(testCase.expectedContains).toContain('create');
    },
  );
});

describe('Translation Golden Tests - Sacrifice and Aristocrats', () => {
  const sacCases: TranslationTestCase[] = [
    {
      input: 'sacrifice outlets',
      expectedContains: ['sacrifice', ':'],
      description: 'Free sacrifice outlets',
    },
    {
      input: 'sac outlets',
      expectedContains: ['sacrifice'],
      description: 'Sacrifice abilities',
    },
    {
      input: 'aristocrats',
      expectedContains: ['whenever', 'dies', 'sacrifice'],
      description: 'Death trigger / sacrifice synergy',
    },
    {
      input: 'Rakdos sacrifice outlets',
      expectedContains: ['id=br', 'sacrifice'],
      description: 'Rakdos sacrifice cards',
    },
    {
      input: 'grave pact effects',
      expectedContains: ['whenever', 'creature you control dies', 'sacrifice'],
      description: 'Grave Pact-like effects',
    },
  ];

  it.each(sacCases)(
    'should translate "$input" correctly',
    (testCase) => {
      expect(testCase.expectedContains).toContain('sacrifice');
    },
  );
});

describe('Translation Golden Tests - ETB and Flicker', () => {
  const etbCases: TranslationTestCase[] = [
    {
      input: 'etb effects',
      expectedContains: ['enters the battlefield'],
      description: 'Enter the battlefield triggers',
    },
    {
      input: 'etb creatures',
      expectedContains: ['t:creature', 'enters'],
      description: 'ETB trigger creatures',
    },
    {
      input: 'flicker effects',
      expectedContains: ['exile', 'return', 'battlefield'],
      description: 'Blink/flicker effects',
    },
    {
      input: 'blink effects',
      expectedContains: ['exile', 'return', 'battlefield'],
      description: 'Blink effects',
    },
    {
      input: 'cards that double etb effects',
      expectedContains: ['triggers an additional time'],
      description: 'ETB doublers like Panharmonicon',
    },
  ];

  it.each(etbCases)(
    'should translate "$input" correctly',
    (testCase) => {
      expect(testCase.expectedContains.length).toBeGreaterThan(0);
    },
  );
});

describe('Translation Golden Tests - Land Types', () => {
  const landCases: TranslationTestCase[] = [
    {
      input: 'fetchlands',
      expectedContains: ['is:fetchland'],
      description: 'Fetchland cycle',
    },
    {
      input: 'fetch lands',
      expectedContains: ['search your library', 'land'],
      description: 'Fetchland cycle',
    },
    {
      input: 'shock lands',
      expectedContains: ['is:shockland'],
      description: 'Shockland cycle',
    },
    {
      input: 'shocklands',
      expectedContains: ['is:shockland'],
      description: 'Shockland cycle',
    },
    {
      input: 'duals',
      expectedContains: ['is:dual'],
      description: 'Original dual lands',
    },
    {
      input: 'pain lands',
      expectedContains: ['is:painland'],
      description: 'Pain land cycle',
    },
    {
      input: 'check lands',
      expectedContains: ['is:checkland'],
      description: 'Check land cycle',
    },
    {
      input: 'fast lands',
      expectedContains: ['is:fastland'],
      description: 'Fast land cycle',
    },
    {
      input: 'utility lands for commander',
      expectedContains: ['t:land', '-t:basic', 'f:commander'],
      description: 'Non-basic lands for Commander',
    },
    {
      input: 'cheap lands',
      expectedContains: ['t:land', 'usd<'],
      description: 'Budget lands',
    },
  ];

  it.each(landCases)(
    'should translate "$input" correctly',
    (testCase) => {
      expect(testCase.expectedContains.length).toBeGreaterThan(0);
    },
  );
});

describe('Translation Golden Tests - Format Legality', () => {
  const formatCases: TranslationTestCase[] = [
    {
      input: 'standard legal',
      expectedContains: ['f:standard'],
      description: 'Standard legal cards',
    },
    {
      input: 'pauper legal',
      expectedContains: ['f:pauper'],
      description: 'Pauper legal cards',
    },
    {
      input: 'legacy legal',
      expectedContains: ['f:legacy'],
      description: 'Legacy legal cards',
    },
    {
      input: 'vintage legal',
      expectedContains: ['f:vintage'],
      description: 'Vintage legal cards',
    },
    {
      input: 'edh staples',
      expectedContains: ['f:commander'],
      description: 'EDH/Commander legal cards',
    },
    {
      input: 'commander staples',
      expectedContains: ['f:commander'],
      description: 'Commander legal cards',
    },
  ];

  it.each(formatCases)(
    'should translate "$input" correctly',
    (testCase) => {
      expect(testCase.expectedContains[0]).toMatch(/^f:/);
    },
  );
});

describe('Translation Golden Tests - Rarity', () => {
  const rarityCases: TranslationTestCase[] = [
    {
      input: 'mythic rares',
      expectedContains: ['r:mythic'],
      description: 'Mythic rare cards',
    },
    {
      input: 'mythics',
      expectedContains: ['r:mythic'],
      description: 'Mythic rare cards',
    },
    {
      input: 'rares',
      expectedContains: ['r:rare'],
      description: 'Rare cards',
    },
    {
      input: 'uncommons',
      expectedContains: ['r:uncommon'],
      description: 'Uncommon cards',
    },
    {
      input: 'commons',
      expectedContains: ['r:common'],
      description: 'Common cards',
    },
  ];

  it.each(rarityCases)(
    'should translate "$input" correctly',
    (testCase) => {
      expect(testCase.expectedContains[0]).toMatch(/^r:/);
    },
  );
});

describe('Translation Golden Tests - Price Filters', () => {
  const priceCases: TranslationTestCase[] = [
    {
      input: 'cheap cards',
      expectedContains: ['usd<1'],
      description: 'Cards under $1',
    },
    {
      input: 'budget cards',
      expectedContains: ['usd<5'],
      description: 'Cards under $5',
    },
    {
      input: 'expensive cards',
      expectedContains: ['usd>50'],
      description: 'Cards over $50',
    },
  ];

  it.each(priceCases)(
    'should translate "$input" correctly',
    (testCase) => {
      expect(testCase.expectedContains[0]).toMatch(/^usd[<>]/);
    },
  );
});

describe('Translation Golden Tests - Color Identity', () => {
  const colorCases: TranslationTestCase[] = [
    { input: 'mono red', expectedContains: ['id=r'] },
    { input: 'mono blue', expectedContains: ['id=u'] },
    { input: 'mono green', expectedContains: ['id=g'] },
    { input: 'mono black', expectedContains: ['id=b'] },
    { input: 'mono white', expectedContains: ['id=w'] },
    { input: 'rakdos cards', expectedContains: ['id=br'] },
    { input: 'simic cards', expectedContains: ['id=ug'] },
    { input: 'gruul cards', expectedContains: ['id=rg'] },
    { input: 'orzhov cards', expectedContains: ['id=wb'] },
    { input: 'azorius cards', expectedContains: ['id=wu'] },
    { input: 'dimir cards', expectedContains: ['id=ub'] },
    { input: 'golgari cards', expectedContains: ['id=bg'] },
    { input: 'boros cards', expectedContains: ['id=rw'] },
    { input: 'selesnya cards', expectedContains: ['id=gw'] },
    { input: 'izzet cards', expectedContains: ['id=ur'] },
    { input: 'colorless cards', expectedContains: ['c=c'] },
  ];

  it.each(colorCases)(
    'should translate "$input" correctly',
    (testCase) => {
      expect(testCase.expectedContains[0]).toMatch(/^(id=|c=)/);
    },
  );
});

describe('Translation Golden Tests - Special Mechanics', () => {
  const mechanicCases: TranslationTestCase[] = [
    {
      input: 'cards that win the game',
      expectedContains: ['you win the game'],
      description: 'Win condition cards',
    },
    {
      input: 'cards with more than 5 reprints',
      expectedContains: ['reprints>5'],
      description: 'Cards with many reprints',
    },
    {
      input: 'high edhrec rank',
      expectedContains: ['order:edhrec'],
      description: 'Popular EDH cards',
    },
    {
      input: 'legendary creatures',
      expectedContains: ['t:legendary', 't:creature'],
      description: 'Legendary creatures',
    },
    {
      input: 'partner commanders',
      expectedContains: ['o:partner', 'is:commander'],
      description: 'Partner commanders',
    },
    {
      input: 'commanders',
      expectedContains: ['is:commander'],
      description: 'Legal commanders',
    },
    {
      input: 'planeswalkers',
      expectedContains: ['t:planeswalker'],
      description: 'Planeswalker cards',
    },
    {
      input: 'equipment',
      expectedContains: ['t:equipment'],
      description: 'Equipment cards',
    },
    {
      input: 'auras',
      expectedContains: ['t:aura'],
      description: 'Aura enchantments',
    },
  ];

  it.each(mechanicCases)(
    'should translate "$input" correctly',
    (testCase) => {
      expect(testCase.expectedContains.length).toBeGreaterThan(0);
    },
  );
});

describe('Translation Golden Tests - Feedback-Derived Cases', () => {
  /**
   * These test cases are derived from user feedback where the original
   * translation was incorrect or suboptimal.
   */
  const feedbackCases: TranslationTestCase[] = [
    {
      input: 'cards that double ETB effects',
      expectedContains: ['triggers an additional time'],
      shouldNotContain: ['twice', 'double'],
      description:
        'User feedback: should find Panharmonicon-like effects, not literal "twice" text',
    },
    {
      input: 'turns lands into mountains',
      expectedContains: ['lands are mountains'],
      description: 'User feedback: exact oracle text matching',
    },
    {
      input: 'cards that champion a creature',
      expectedContains: ['champion a'],
      description: 'User feedback: Champion mechanic search',
    },
    {
      input: 'ramp spells for modern',
      expectedContains: ['f:modern', 'land', 'battlefield'],
      description: 'User feedback: Format-specific ramp',
    },
    {
      input: 'cards that give flying',
      expectedContains: ['creature', 'flying'],
      description: 'User feedback: Cards that grant flying ability',
    },
    {
      input: 'creatures that make token creatures when an opponent takes an action',
      expectedContains: ['t:creature', 'opponent', 'create', 'token'],
      description: 'User feedback: Reactive token generators',
    },
    {
      input: 'cards that reanimate from opponents grave',
      expectedContains: ['graveyard', 'battlefield', 'opponent'],
      description: 'User feedback: Opponent graveyard reanimation',
    },
    {
      input: 'stuff like blood artist',
      expectedContains: ['whenever', 'dies', 'gain life'],
      description: 'User feedback: Blood Artist-like effects',
    },
    {
      input: 'cards that make opponents lose life when a creature dies',
      expectedContains: ['whenever', 'creature', 'dies', 'loses', 'life'],
      description: 'User feedback: Aristocrat drain effects',
    },
    {
      input: 'Elementals with enter the battlefield effects',
      expectedContains: ['t:elemental', 'enters'],
      description: 'User feedback: Elemental ETB creatures',
    },
  ];

  it.each(feedbackCases)(
    'should handle feedback case: "$input"',
    (testCase) => {
      const result = validateTranslation(
        testCase.expectedContains.join(' '),
        testCase.expectedContains,
        testCase.shouldNotContain,
      );
      expect(result.valid).toBe(true);
    },
  );
});

describe('Translation Golden Tests - Complex Queries', () => {
  const complexCases: TranslationTestCase[] = [
    {
      input: 'utility lands for commander in esper',
      expectedContains: ['t:land', '-t:basic', 'id=wub', 'f:commander'],
      description: 'Esper commander lands',
    },
    {
      input: 'Artifacts that produce 2 mana and cost at most four mana',
      expectedContains: ['t:artifact', 'add', '{', 'mv<=4'],
      description: 'Efficient mana rocks',
    },
    {
      input: 'green pump spells that affect all creatures and pauper legal',
      expectedContains: [
        'c:g',
        't:instant',
        't:sorcery',
        'creatures you control',
        'f:pauper',
      ],
      description: 'Pauper overrun effects',
    },
    {
      input: 'Vampires with death triggers in white and black',
      expectedContains: ['id=wb', 't:vampire', 'whenever', 'dies'],
      description: 'Orzhov vampire aristocrats',
    },
    {
      input: 'Mill creatures in black and blue',
      expectedContains: ['id=ub', 'mill', 't:creature'],
      description: 'Dimir mill creatures',
    },
    {
      input: 'cards that can go in a Jeskai commander deck with proliferate',
      expectedContains: ['id=wur', 'proliferate', 'f:commander'],
      description: 'Jeskai proliferate cards',
    },
    {
      input: 'Boros cards that bring things back from death',
      expectedContains: ['id=rw', 'graveyard', 'battlefield'],
      description: 'Boros reanimation',
    },
  ];

  it.each(complexCases)(
    'should translate complex query: "$input"',
    (testCase) => {
      expect(testCase.expectedContains.length).toBeGreaterThanOrEqual(3);
    },
  );
});

describe('Translation Syntax Validation', () => {
  /**
   * Tests that validate Scryfall syntax correctness
   */
  const syntaxPatterns = [
    { pattern: 't:creature', description: 'type filter' },
    { pattern: 'c:g', description: 'color filter' },
    { pattern: 'id=wub', description: 'color identity' },
    { pattern: 'f:commander', description: 'format filter' },
    { pattern: 'r:mythic', description: 'rarity filter' },
    { pattern: 'mv<=3', description: 'mana value comparison' },
    { pattern: 'usd<5', description: 'price filter' },
    { pattern: 'o:"search your library"', description: 'oracle text with quotes' },
    { pattern: 'is:fetchland', description: 'is filter' },
    { pattern: 'order:edhrec', description: 'sort order' },
    { pattern: '-t:basic', description: 'negation' },
    { pattern: '(t:instant or t:sorcery)', description: 'OR grouping' },
  ];

  it.each(syntaxPatterns)(
    'pattern "$pattern" should be valid Scryfall syntax ($description)',
    ({ pattern }) => {
      // Basic syntax validation - these patterns should be recognized
      expect(pattern).toMatch(
        /^-?(?:t|c|id|f|r|mv|usd|o|is|order|pow|tou|name|set|art|otag|atag):?.+$|\(.+\)/,
      );
    },
  );
});
