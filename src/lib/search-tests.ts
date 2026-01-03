/**
 * Test inputs for validating search translation quality
 * Each test case documents expected behavior
 */

export const SEARCH_TEST_CASES = [
  // Slang & MTG terminology
  {
    input: "mana dorks",
    expectedContains: ["t:creature", "add", "mana"],
    description: "Should find creatures that tap for mana"
  },
  {
    input: "wheel effects",
    expectedContains: ["discard", "draw"],
    description: "Should find cards that make players discard and draw"
  },
  {
    input: "hatebears",
    expectedContains: ["t:creature", "can't"],
    description: "Should find small creatures with taxing effects"
  },
  {
    input: "aristocrats",
    expectedContains: ["t:creature", "dies"],
    description: "Should find creatures that benefit from death triggers"
  },
  {
    input: "stax pieces",
    expectedContains: ["can't", "pay"],
    description: "Should find permanents that restrict opponents"
  },
  
  // Budget queries
  {
    input: "budget board wipes",
    expectedContains: ["destroy all", "usd<"],
    description: "Should include price filter for cheap cards"
  },
  {
    input: "cheap ramp under $2",
    expectedContains: ["add", "mana", "usd<"],
    description: "Should translate specific price constraints"
  },
  {
    input: "affordable counterspells",
    expectedContains: ["counter", "usd<"],
    description: "Should interpret 'affordable' as budget filter"
  },
  
  // Commander assumptions
  {
    input: "good Atraxa staples",
    expectedContains: ["game:paper"],
    description: "Should recognize commander context"
  },
  {
    input: "cards for Prosper deck",
    expectedContains: ["game:paper"],
    description: "Should handle deck-building queries"
  },
  {
    input: "Simic value engines",
    expectedContains: ["c:ug", "game:paper"],
    description: "Should translate color pair names"
  },
  
  // Impossible/edge constraints
  {
    input: "blue cards that destroy enchantments",
    expectedContains: ["c:u", "destroy", "enchantment"],
    description: "Should try even if results may be few"
  },
  {
    input: "green counterspells",
    expectedContains: ["c:g", "counter"],
    description: "Should attempt even unusual combinations"
  },
  {
    input: "colorless board wipes",
    expectedContains: ["c:c", "destroy all"],
    description: "Should handle colorless identity"
  },
  
  // Follow-up context
  {
    input: "but cheaper",
    description: "Follow-up should inherit previous context and add price filter"
  },
  {
    input: "in modern instead",
    description: "Should change format while keeping other constraints"
  },
  
  // Specific mechanics
  {
    input: "cards with landfall",
    expectedContains: ["o:landfall"],
    description: "Should find keyword abilities"
  },
  {
    input: "graveyard synergy in black",
    expectedContains: ["c:b", "graveyard"],
    description: "Should handle mechanic + color"
  },
  {
    input: "ETB creatures that blink",
    expectedContains: ["t:creature", "enters", "exile"],
    description: "Should understand blink mechanics"
  },
  {
    input: "sacrifice outlets that don't cost mana",
    expectedContains: ["sacrifice", "-o:\"{\""],
    description: "Should handle negative constraints"
  },
  
  // Universe/set specific
  {
    input: "Avatar the Last Airbender creatures",
    expectedContains: ["e:tla", "t:creature"],
    description: "Should use correct set code"
  },
  {
    input: "Lord of the Rings legends",
    expectedContains: ["e:ltr", "t:legendary"],
    description: "Should handle crossover sets"
  },
];

/**
 * Validation function for test cases
 */
export function validateSearchResult(
  input: string, 
  result: string, 
  testCase: typeof SEARCH_TEST_CASES[0]
): { passed: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check game:paper is always included
  if (!result.includes("game:paper")) {
    issues.push("Missing game:paper filter");
  }
  
  // Check expected terms
  if (testCase.expectedContains) {
    for (const term of testCase.expectedContains) {
      if (!result.toLowerCase().includes(term.toLowerCase())) {
        issues.push(`Missing expected term: ${term}`);
      }
    }
  }
  
  // Check for obvious hallucinations
  const cardNamePattern = /\"[A-Z][a-z]+(?:\s[A-Z][a-z]+)+\"/;
  if (cardNamePattern.test(result)) {
    issues.push("Possible card name hallucination detected");
  }
  
  return {
    passed: issues.length === 0,
    issues
  };
}
