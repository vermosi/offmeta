/**
 * Comprehensive test suite for validating search translation quality
 * Each test case documents expected behavior for MTG slang → Scryfall syntax
 */

export interface SearchTestCase {
  input: string;
  expectedContains?: string[];
  expectedNotContains?: string[];
  description: string;
  category: 'slang' | 'tribal' | 'budget' | 'format' | 'mechanics' | 'sets' | 'colors' | 'context' | 'edge';
}

export const SEARCH_TEST_CASES: SearchTestCase[] = [
  // ==================== CORE SLANG ====================
  {
    input: "mana dorks",
    expectedContains: ["t:creature", "add", "{"],
    description: "Should find creatures that tap for mana",
    category: 'slang'
  },
  {
    input: "mana rocks",
    expectedContains: ["t:artifact", "add"],
    description: "Should find artifacts that produce mana",
    category: 'slang'
  },
  {
    input: "cheap green ramp spells",
    expectedContains: ["c:g", "search", "land", "t:instant", "t:sorcery"],
    description: "Should find land-fetching instants/sorceries like Rampant Growth",
    category: 'slang'
  },
  {
    input: "green ramp",
    expectedContains: ["c:g", "search", "land"],
    description: "Should find land ramp effects in green",
    category: 'slang'
  },
  {
    input: "wheel effects",
    expectedContains: ["discard", "draw"],
    description: "Should find cards that make players discard and draw",
    category: 'slang'
  },
  {
    input: "hatebears",
    expectedContains: ["t:creature", "can't"],
    description: "Should find small creatures with taxing effects",
    category: 'slang'
  },
  {
    input: "aristocrats",
    expectedContains: ["t:creature", "dies"],
    description: "Should find creatures that benefit from death triggers",
    category: 'slang'
  },
  {
    input: "stax pieces",
    expectedContains: ["can't"],
    description: "Should find permanents that restrict opponents",
    category: 'slang'
  },
  {
    input: "black tutors",
    expectedContains: ["c:b", "search your library"],
    description: "Should find cards that search library",
    category: 'slang'
  },
  {
    input: "creature tutors",
    expectedContains: ["search your library", "creature"],
    description: "Should find cards that tutor for creatures",
    category: 'slang'
  },
  {
    input: "spot removal",
    expectedContains: ["destroy target", "exile target"],
    description: "Should find targeted removal",
    category: 'slang'
  },
  {
    input: "white board wipes",
    expectedContains: ["c:w", "destroy all"],
    description: "Should find mass removal in white",
    category: 'slang'
  },
  {
    input: "wraths",
    expectedContains: ["destroy all"],
    description: "Should find board wipes",
    category: 'slang'
  },
  {
    input: "finishers",
    expectedContains: ["t:creature", "mv>="],
    description: "Should find big game-ending threats",
    category: 'slang'
  },
  {
    input: "pillowfort cards",
    expectedContains: ["can't attack", "prevent"],
    description: "Should find defensive deterrent cards",
    category: 'slang'
  },
  {
    input: "voltron equipment",
    expectedContains: ["t:equipment"],
    description: "Should find equipment for buffing creatures",
    category: 'slang'
  },
  {
    input: "blink effects",
    expectedContains: ["exile", "return", "battlefield"],
    description: "Should find flicker/blink effects",
    category: 'slang'
  },
  {
    input: "reanimation spells",
    expectedContains: ["graveyard", "onto the battlefield"],
    description: "Should find cards that return creatures from graveyard",
    category: 'slang'
  },
  {
    input: "mill cards",
    expectedContains: ["mill", "library", "graveyard"],
    description: "Should find mill effects",
    category: 'slang'
  },
  {
    input: "draw engines",
    expectedContains: ["draw", "whenever"],
    description: "Should find repeatable card draw",
    category: 'slang'
  },
  {
    input: "blue cantrips",
    expectedContains: ["c:u", "draw a card", "t:instant", "t:sorcery"],
    description: "Should find cheap blue spells that draw",
    category: 'slang'
  },
  {
    input: "counterspells",
    expectedContains: ["t:instant", "counter target"],
    description: "Should find counter magic",
    category: 'slang'
  },
  {
    input: "anthems",
    expectedContains: ["creatures you control", "+"],
    description: "Should find effects that buff all creatures",
    category: 'slang'
  },
  {
    input: "lords",
    expectedContains: ["t:creature", "other", "+"],
    description: "Should find creatures that buff a type",
    category: 'slang'
  },
  {
    input: "token generators",
    expectedContains: ["create", "token"],
    description: "Should find cards that create tokens",
    category: 'slang'
  },
  {
    input: "sacrifice outlets",
    expectedContains: ["sacrifice", ":"],
    description: "Should find free sacrifice effects",
    category: 'slang'
  },
  {
    input: "clone effects",
    expectedContains: ["copy", "creature"],
    description: "Should find creature copy effects",
    category: 'slang'
  },
  {
    input: "extra turn spells",
    expectedContains: ["extra turn"],
    description: "Should find extra turn effects",
    category: 'slang'
  },
  {
    input: "storm cards",
    expectedContains: ["storm"],
    description: "Should find storm mechanic cards",
    category: 'slang'
  },
  {
    input: "treasure makers",
    expectedContains: ["create", "treasure"],
    description: "Should find treasure token creators",
    category: 'slang'
  },
  {
    input: "untappers",
    expectedContains: ["untap target"],
    description: "Should find cards that untap permanents",
    category: 'slang'
  },
  {
    input: "landfall triggers",
    expectedContains: ["landfall"],
    description: "Should find landfall abilities",
    category: 'slang'
  },
  {
    input: "haste enablers",
    expectedContains: ["creatures", "haste"],
    description: "Should find cards that grant haste",
    category: 'slang'
  },
  {
    input: "free spells",
    expectedContains: ["without paying"],
    description: "Should find cards cast for free",
    category: 'slang'
  },
  {
    input: "evasion creatures",
    expectedContains: ["flying", "can't be blocked", "menace", "trample"],
    description: "Should find creatures hard to block",
    category: 'slang'
  },

  // ==================== TRIBAL ====================
  {
    input: "elf lords",
    expectedContains: ["t:elf", "other", "elf", "+"],
    description: "Should find elves that buff other elves",
    category: 'tribal'
  },
  {
    input: "elf tribal",
    expectedContains: ["t:elf"],
    description: "Should find elf creatures/cards",
    category: 'tribal'
  },
  {
    input: "goblin lords",
    expectedContains: ["t:goblin", "other", "goblin"],
    description: "Should find goblins that buff other goblins",
    category: 'tribal'
  },
  {
    input: "goblin tribal",
    expectedContains: ["t:goblin"],
    description: "Should find goblin creatures/cards",
    category: 'tribal'
  },
  {
    input: "zombie lords",
    expectedContains: ["t:zombie", "other", "zombie"],
    description: "Should find zombies that buff other zombies",
    category: 'tribal'
  },
  {
    input: "zombie tribal cards",
    expectedContains: ["zombie"],
    description: "Should find zombie-related cards",
    category: 'tribal'
  },
  {
    input: "vampire lifegain",
    expectedContains: ["t:vampire", "life"],
    description: "Should find vampires with lifegain synergy",
    category: 'tribal'
  },
  {
    input: "vampire lords",
    expectedContains: ["t:vampire", "other", "vampire"],
    description: "Should find vampire lords",
    category: 'tribal'
  },
  {
    input: "dragon finishers",
    expectedContains: ["t:dragon"],
    description: "Should find big dragons",
    category: 'tribal'
  },
  {
    input: "dragon tribal",
    expectedContains: ["t:dragon"],
    description: "Should find dragon creatures/cards",
    category: 'tribal'
  },
  {
    input: "angel tribal",
    expectedContains: ["t:angel"],
    description: "Should find angel creatures/cards",
    category: 'tribal'
  },
  {
    input: "merfolk lords",
    expectedContains: ["t:merfolk", "other", "merfolk"],
    description: "Should find merfolk lords",
    category: 'tribal'
  },
  {
    input: "human tribal",
    expectedContains: ["t:human"],
    description: "Should find human creatures/cards",
    category: 'tribal'
  },
  {
    input: "wizard tribal",
    expectedContains: ["t:wizard"],
    description: "Should find wizard creatures/cards",
    category: 'tribal'
  },
  {
    input: "sliver tribal",
    expectedContains: ["t:sliver"],
    description: "Should find sliver creatures",
    category: 'tribal'
  },
  {
    input: "eldrazi creatures",
    expectedContains: ["t:eldrazi"],
    description: "Should find eldrazi creatures",
    category: 'tribal'
  },
  {
    input: "dinosaur tribal",
    expectedContains: ["t:dinosaur"],
    description: "Should find dinosaur creatures",
    category: 'tribal'
  },
  {
    input: "pirate treasure synergy",
    expectedContains: ["t:pirate", "treasure"],
    description: "Should find pirates with treasure synergy",
    category: 'tribal'
  },
  {
    input: "spirit tribal",
    expectedContains: ["t:spirit"],
    description: "Should find spirit creatures",
    category: 'tribal'
  },
  {
    input: "faerie tribal",
    expectedContains: ["t:faerie"],
    description: "Should find faerie creatures",
    category: 'tribal'
  },
  {
    input: "werewolf tribal",
    expectedContains: ["t:werewolf", "werewolf"],
    description: "Should find werewolf creatures",
    category: 'tribal'
  },
  {
    input: "rat tribal",
    expectedContains: ["t:rat"],
    description: "Should find rat creatures",
    category: 'tribal'
  },
  {
    input: "cat tribal",
    expectedContains: ["t:cat"],
    description: "Should find cat creatures",
    category: 'tribal'
  },
  {
    input: "knight tribal",
    expectedContains: ["t:knight"],
    description: "Should find knight creatures",
    category: 'tribal'
  },
  {
    input: "soldier tokens",
    expectedContains: ["soldier", "token"],
    description: "Should find soldier token creators",
    category: 'tribal'
  },

  // ==================== BUDGET ====================
  {
    input: "budget board wipes",
    expectedContains: ["destroy all", "usd<"],
    description: "Should include price filter for cheap cards",
    category: 'budget'
  },
  {
    input: "cheap ramp",
    expectedContains: ["usd<"],
    description: "Should translate 'cheap' as budget filter",
    category: 'budget'
  },
  {
    input: "affordable counterspells",
    expectedContains: ["counter", "usd<"],
    description: "Should interpret 'affordable' as budget filter",
    category: 'budget'
  },
  {
    input: "very cheap removal",
    expectedContains: ["usd<1"],
    description: "Should use tighter price filter for 'very cheap'",
    category: 'budget'
  },
  {
    input: "expensive dragons",
    expectedContains: ["t:dragon", "usd>"],
    description: "Should find high-value dragons",
    category: 'budget'
  },

  // ==================== FORMATS ====================
  {
    input: "modern legal counterspells",
    expectedContains: ["f:modern", "counter"],
    description: "Should add format legality filter",
    category: 'format'
  },
  {
    input: "commander staples",
    expectedContains: ["f:commander"],
    description: "Should recognize EDH/commander format",
    category: 'format'
  },
  {
    input: "standard removal",
    expectedContains: ["f:standard", "destroy", "exile"],
    description: "Should filter for standard legality",
    category: 'format'
  },
  {
    input: "pioneer ramp",
    expectedContains: ["f:pioneer"],
    description: "Should recognize pioneer format",
    category: 'format'
  },
  {
    input: "pauper counterspells",
    expectedContains: ["f:pauper", "counter"],
    description: "Should recognize pauper format",
    category: 'format'
  },
  {
    input: "legacy storm",
    expectedContains: ["f:legacy", "storm"],
    description: "Should recognize legacy format",
    category: 'format'
  },

  // ==================== SETS/UNIVERSES ====================
  {
    input: "Avatar the Last Airbender creatures",
    expectedContains: ["e:tla", "t:creature"],
    description: "Should use ATLA set code",
    category: 'sets'
  },
  {
    input: "Lord of the Rings legends",
    expectedContains: ["e:ltr", "t:legendary"],
    description: "Should handle LOTR crossover set",
    category: 'sets'
  },
  {
    input: "Final Fantasy cards",
    expectedContains: ["e:fin"],
    description: "Should use Final Fantasy set code",
    category: 'sets'
  },
  {
    input: "Warhammer 40k creatures",
    expectedContains: ["e:40k", "t:creature"],
    description: "Should use Warhammer set code",
    category: 'sets'
  },
  {
    input: "Doctor Who legendaries",
    expectedContains: ["e:who", "t:legendary"],
    description: "Should use Doctor Who set code",
    category: 'sets'
  },
  {
    input: "Fallout cards",
    expectedContains: ["e:pip"],
    description: "Should use Fallout set code",
    category: 'sets'
  },

  // ==================== COLORS ====================
  {
    input: "Simic value engines",
    expectedContains: ["c:ug"],
    description: "Should translate Simic to UG colors",
    category: 'colors'
  },
  {
    input: "Rakdos sacrifice",
    expectedContains: ["c:br", "sacrifice"],
    description: "Should translate Rakdos to BR colors",
    category: 'colors'
  },
  {
    input: "Boros aggro creatures",
    expectedContains: ["c:rw", "t:creature"],
    description: "Should translate Boros to RW colors",
    category: 'colors'
  },
  {
    input: "Golgari graveyard",
    expectedContains: ["c:bg", "graveyard"],
    description: "Should translate Golgari to BG colors",
    category: 'colors'
  },
  {
    input: "Azorius control",
    expectedContains: ["c:wu"],
    description: "Should translate Azorius to WU colors",
    category: 'colors'
  },
  {
    input: "Dimir mill",
    expectedContains: ["c:ub", "mill"],
    description: "Should translate Dimir to UB colors",
    category: 'colors'
  },
  {
    input: "Gruul stompy",
    expectedContains: ["c:rg", "t:creature"],
    description: "Should translate Gruul to RG colors",
    category: 'colors'
  },
  {
    input: "Orzhov lifegain",
    expectedContains: ["c:wb", "life"],
    description: "Should translate Orzhov to WB colors",
    category: 'colors'
  },
  {
    input: "Izzet spellslinger",
    expectedContains: ["c:ur"],
    description: "Should translate Izzet to UR colors",
    category: 'colors'
  },
  {
    input: "Selesnya tokens",
    expectedContains: ["c:gw", "token"],
    description: "Should translate Selesnya to GW colors",
    category: 'colors'
  },
  {
    input: "colorless board wipes",
    expectedContains: ["c:c", "destroy all"],
    description: "Should handle colorless identity",
    category: 'colors'
  },
  {
    input: "mono red burn",
    expectedContains: ["c:r", "damage"],
    description: "Should handle mono-color",
    category: 'colors'
  },

  // ==================== MECHANICS ====================
  {
    input: "cards with landfall",
    expectedContains: ["landfall"],
    description: "Should find keyword abilities",
    category: 'mechanics'
  },
  {
    input: "graveyard synergy in black",
    expectedContains: ["c:b", "graveyard"],
    description: "Should handle mechanic + color",
    category: 'mechanics'
  },
  {
    input: "ETB creatures",
    expectedContains: ["t:creature", "enters"],
    description: "Should understand ETB (enters the battlefield)",
    category: 'mechanics'
  },
  {
    input: "hexproof creatures",
    expectedContains: ["t:creature", "hexproof"],
    description: "Should find hexproof keyword",
    category: 'mechanics'
  },
  {
    input: "indestructible permanents",
    expectedContains: ["indestructible"],
    description: "Should find indestructible keyword",
    category: 'mechanics'
  },
  {
    input: "protection from black",
    expectedContains: ["protection from"],
    description: "Should find protection abilities",
    category: 'mechanics'
  },
  {
    input: "flying creatures",
    expectedContains: ["t:creature", "flying"],
    description: "Should find flying creatures",
    category: 'mechanics'
  },
  {
    input: "trample creatures",
    expectedContains: ["t:creature", "trample"],
    description: "Should find trample creatures",
    category: 'mechanics'
  },
  {
    input: "deathtouch creatures",
    expectedContains: ["t:creature", "deathtouch"],
    description: "Should find deathtouch creatures",
    category: 'mechanics'
  },
  {
    input: "lifelink creatures",
    expectedContains: ["t:creature", "lifelink"],
    description: "Should find lifelink creatures",
    category: 'mechanics'
  },
  {
    input: "flash creatures",
    expectedContains: ["t:creature", "flash"],
    description: "Should find flash creatures",
    category: 'mechanics'
  },
  {
    input: "vigilance creatures",
    expectedContains: ["t:creature", "vigilance"],
    description: "Should find vigilance creatures",
    category: 'mechanics'
  },
  {
    input: "double strike",
    expectedContains: ["double strike"],
    description: "Should find double strike keyword",
    category: 'mechanics'
  },
  {
    input: "first strike creatures",
    expectedContains: ["t:creature", "first strike"],
    description: "Should find first strike keyword",
    category: 'mechanics'
  },

  // ==================== CONTEXT/FOLLOW-UP ====================
  {
    input: "but cheaper",
    description: "Follow-up should inherit previous context and add price filter",
    category: 'context'
  },
  {
    input: "in modern instead",
    description: "Should change format while keeping other constraints",
    category: 'context'
  },
  {
    input: "same but in blue",
    description: "Should change color while keeping other constraints",
    category: 'context'
  },
  {
    input: "with higher power",
    description: "Should add power constraint to previous query",
    category: 'context'
  },

  // ==================== EDGE CASES ====================
  {
    input: "blue cards that destroy enchantments",
    expectedContains: ["c:u", "destroy", "enchantment"],
    description: "Should try even if results may be few",
    category: 'edge'
  },
  {
    input: "green counterspells",
    expectedContains: ["c:g", "counter"],
    description: "Should attempt even unusual combinations",
    category: 'edge'
  },
  {
    input: "lands that tap for any color",
    expectedContains: ["t:land", "add", "any color"],
    description: "Should find rainbow lands",
    category: 'edge'
  },
  {
    input: "creatures that make treasure tokens",
    expectedContains: ["t:creature", "create", "treasure"],
    description: "Should find treasure-making creatures",
    category: 'edge'
  },
  {
    input: "sacrifice outlets that don't cost mana",
    expectedContains: ["sacrifice"],
    description: "Should handle complex constraints",
    category: 'edge'
  },
  {
    input: "equipment that gives hexproof",
    expectedContains: ["t:equipment", "hexproof"],
    description: "Should find specific equipment",
    category: 'edge'
  },
  {
    input: "auras that return to hand",
    expectedContains: ["t:aura", "return", "hand"],
    description: "Should find recursive auras",
    category: 'edge'
  },
  {
    input: "planeswalkers that create tokens",
    expectedContains: ["t:planeswalker", "create", "token"],
    description: "Should find token-making planeswalkers",
    category: 'edge'
  },
  {
    input: "legendary creatures with partner",
    expectedContains: ["t:legendary", "t:creature", "partner"],
    description: "Should find partner commanders",
    category: 'edge'
  },
];

/**
 * Validation function for test cases
 */
export function validateSearchResult(
  input: string, 
  result: string, 
  testCase: SearchTestCase
): { passed: boolean; issues: string[] } {
  const issues: string[] = [];
  const lowerResult = result.toLowerCase();
  
  // Check game:paper is always included
  if (!lowerResult.includes("game:paper")) {
    issues.push("Missing game:paper filter");
  }
  
  // Check expected terms (OR logic - at least one variant should match)
  if (testCase.expectedContains) {
    for (const term of testCase.expectedContains) {
      const variants = term.toLowerCase().split('|').map(t => t.trim());
      const found = variants.some(v => lowerResult.includes(v));
      if (!found) {
        issues.push(`Missing expected term: ${term}`);
      }
    }
  }
  
  // Check terms that should NOT be present
  if (testCase.expectedNotContains) {
    for (const term of testCase.expectedNotContains) {
      if (lowerResult.includes(term.toLowerCase())) {
        issues.push(`Found unexpected term: ${term}`);
      }
    }
  }
  
  // Check for obvious hallucinations (card names in quotes that look like proper nouns)
  const cardNamePattern = /\"[A-Z][a-z]+(?:,?\s[A-Z][a-z]+)+\"/;
  if (cardNamePattern.test(result)) {
    issues.push("Possible card name hallucination detected");
  }
  
  // Check for balanced quotes
  const doubleQuotes = (result.match(/"/g) || []).length;
  if (doubleQuotes % 2 !== 0) {
    issues.push("Unbalanced double quotes");
  }
  
  // Check for balanced parentheses
  let parenCount = 0;
  for (const char of result) {
    if (char === '(') parenCount++;
    if (char === ')') parenCount--;
    if (parenCount < 0) {
      issues.push("Unbalanced parentheses");
      break;
    }
  }
  if (parenCount !== 0 && !issues.includes("Unbalanced parentheses")) {
    issues.push("Unbalanced parentheses");
  }
  
  return {
    passed: issues.length === 0,
    issues
  };
}

/**
 * Get test cases by category
 */
export function getTestsByCategory(category: SearchTestCase['category']): SearchTestCase[] {
  return SEARCH_TEST_CASES.filter(tc => tc.category === category);
}

/**
 * Get all categories with counts
 */
export function getTestCategorySummary(): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const tc of SEARCH_TEST_CASES) {
    summary[tc.category] = (summary[tc.category] || 0) + 1;
  }
  return summary;
}

/**
 * Run all tests and return summary
 */
export function runAllTests(
  translateFn: (input: string) => Promise<string>
): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: Array<{
    input: string;
    result: string;
    passed: boolean;
    issues: string[];
    category: string;
  }>;
}> {
  return new Promise(async (resolve) => {
    const results: Array<{
      input: string;
      result: string;
      passed: boolean;
      issues: string[];
      category: string;
    }> = [];
    
    for (const testCase of SEARCH_TEST_CASES) {
      // Skip context tests that need previous queries
      if (testCase.category === 'context' && !testCase.expectedContains) {
        continue;
      }
      
      try {
        const result = await translateFn(testCase.input);
        const validation = validateSearchResult(testCase.input, result, testCase);
        
        results.push({
          input: testCase.input,
          result,
          passed: validation.passed,
          issues: validation.issues,
          category: testCase.category
        });
      } catch (error) {
        results.push({
          input: testCase.input,
          result: '',
          passed: false,
          issues: [`Error: ${error instanceof Error ? error.message : 'Unknown error'}`],
          category: testCase.category
        });
      }
    }
    
    resolve({
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      results
    });
  });
}
