import { describe, it, expect } from 'vitest';

/**
 * Scryfall Syntax Validation Test Suite
 * Tests queries directly against Scryfall API to verify syntax validity.
 */

const TEST_CASES = [
  // PASS cases - should parse successfully
  { id: 'PASS_001', expected: 'PASS', query: 't:creature o:draw' },
  { id: 'PASS_002', expected: 'PASS', query: 't:fish or t:bird' },
  { id: 'PASS_003', expected: 'PASS', query: 't:land (a:titus or a:avon)' },
  {
    id: 'PASS_004',
    expected: 'PASS',
    query: 't:legendary (t:goblin or t:elf)',
  },
  { id: 'PASS_005', expected: 'PASS', query: '-fire c:r t:instant' },
  { id: 'PASS_006', expected: 'PASS', query: 't:goblin -t:creature' },
  { id: 'PASS_007', expected: 'PASS', query: 'not:reprint e:c16' },
  { id: 'PASS_008', expected: 'PASS', query: '-not:reprint e:c16' },

  { id: 'PASS_009', expected: 'PASS', query: 'c:rg' },
  { id: 'PASS_010', expected: 'PASS', query: 'color>=uw -c:red' },
  { id: 'PASS_011', expected: 'PASS', query: 'id<=esper t:instant' },
  { id: 'PASS_012', expected: 'PASS', query: 'id:c t:land' },
  { id: 'PASS_013', expected: 'PASS', query: 'has:indicator' },

  {
    id: 'PASS_014',
    expected: 'PASS',
    query: 'o:"enters the battlefield tapped"',
  },
  { id: 'PASS_015', expected: 'PASS', query: 'o:"~ enters the battlefield"' },
  { id: 'PASS_016', expected: 'PASS', query: 'fo:cycling' },
  { id: 'PASS_017', expected: 'PASS', query: 'keyword:flying t:creature' },

  { id: 'PASS_018', expected: 'PASS', query: 'mana:{G}{U}' },
  { id: 'PASS_019', expected: 'PASS', query: 'm:{2/G}' },
  { id: 'PASS_020', expected: 'PASS', query: 'm:{R/P}' },
  { id: 'PASS_021', expected: 'PASS', query: 'mv<=2 t:instant' },
  { id: 'PASS_022', expected: 'PASS', query: 'mv:even' },
  { id: 'PASS_023', expected: 'PASS', query: 'devotion>=GGG' },
  { id: 'PASS_024', expected: 'PASS', query: 'produces=wu' },

  { id: 'PASS_025', expected: 'PASS', query: 'pow>=8' },
  { id: 'PASS_026', expected: 'PASS', query: 'pow>tou c:w t:creature' },
  { id: 'PASS_027', expected: 'PASS', query: 't:planeswalker loy=3' },

  { id: 'PASS_028', expected: 'PASS', query: 'is:dfc' },
  { id: 'PASS_029', expected: 'PASS', query: 'is:mdfc' },
  { id: 'PASS_030', expected: 'PASS', query: 'is:hybrid' },
  { id: 'PASS_031', expected: 'PASS', query: 'is:phyrexian' },
  { id: 'PASS_032', expected: 'PASS', query: 'is:modal' },
  { id: 'PASS_033', expected: 'PASS', query: 'is:vanilla' },

  { id: 'PASS_034', expected: 'PASS', query: 'r:common t:artifact' },
  { id: 'PASS_035', expected: 'PASS', query: 'r>=rare' },
  { id: 'PASS_036', expected: 'PASS', query: 'e:war cn>50' },
  { id: 'PASS_037', expected: 'PASS', query: 'st:masters' },
  { id: 'PASS_038', expected: 'PASS', query: 'is:booster' },

  { id: 'PASS_039', expected: 'PASS', query: 'f:pauper c:g' },
  { id: 'PASS_040', expected: 'PASS', query: 'banned:legacy' },
  { id: 'PASS_041', expected: 'PASS', query: 'restricted:vintage' },
  { id: 'PASS_042', expected: 'PASS', query: 'is:commander' },
  { id: 'PASS_043', expected: 'PASS', query: 'is:reserved' },

  { id: 'PASS_044', expected: 'PASS', query: 'usd>=0.50 e:ema' },
  { id: 'PASS_045', expected: 'PASS', query: 'cheapest:usd usd>0' },

  { id: 'PASS_046', expected: 'PASS', query: 'a:"proce"' },
  { id: 'PASS_047', expected: 'PASS', query: 'ft:mishra' },
  { id: 'PASS_048', expected: 'PASS', query: 'wm:orzhov' },
  { id: 'PASS_049', expected: 'PASS', query: 'artists>1' },

  { id: 'PASS_050', expected: 'PASS', query: 'border:borderless' },
  { id: 'PASS_051', expected: 'PASS', query: 'frame:2003' },
  { id: 'PASS_052', expected: 'PASS', query: 'is:foil' },
  { id: 'PASS_053', expected: 'PASS', query: 'is:etched' },
  { id: 'PASS_054', expected: 'PASS', query: 'is:hires' },

  { id: 'PASS_055', expected: 'PASS', query: 'game:arena' },
  { id: 'PASS_056', expected: 'PASS', query: 'is:digital' },
  { id: 'PASS_057', expected: 'PASS', query: 'is:promo' },

  { id: 'PASS_058', expected: 'PASS', query: 'year<=1994' },
  { id: 'PASS_059', expected: 'PASS', query: 'date>=2015-08-18' },

  { id: 'PASS_060', expected: 'PASS', query: 'art:squirrel' },
  { id: 'PASS_061', expected: 'PASS', query: 'function:removal' },
  { id: 'PASS_062', expected: 'PASS', query: 'otag:ramp' },

  { id: 'PASS_063', expected: 'PASS', query: 'lang:japanese' },
  { id: 'PASS_064', expected: 'PASS', query: 'is:fetchland' },
  { id: 'PASS_065', expected: 'PASS', query: 'is:shockland' },

  { id: 'PASS_066', expected: 'PASS', query: '!fire' },
  { id: 'PASS_067', expected: 'PASS', query: '!"Lightning Bolt"' },

  { id: 'PASS_068', expected: 'PASS', query: 't:dragon display:grid' },
  {
    id: 'PASS_069',
    expected: 'PASS',
    query: 't:creature order:rarity dir:asc',
  },
  // PASS_070 removed - prefer: is not a valid Scryfall parameter

  { id: 'PASS_071', expected: 'PASS', query: 'name:/\\\\bizzet\\\\b/' },
  { id: 'PASS_072', expected: 'PASS', query: 'o:/~ enters the battlefield/' },
  // PASS_073-075 removed - \s regex is not supported by Scryfall

  // FAIL cases - should return syntax or regex error
  { id: 'FAIL_076', expected: 'FAIL', query: 'o:/[[[invalid/' },
  { id: 'FAIL_077', expected: 'FAIL', query: 'unknownkey:value' },

  // Additional PASS cases
  { id: 'PASS_ADD_001', expected: 'PASS', query: 'commander:sultai' },
  { id: 'PASS_ADD_002', expected: 'PASS', query: 'ci:BUG' },
  { id: 'PASS_ADD_003', expected: 'PASS', query: 'commander<=esper t:instant' },
  { id: 'PASS_ADD_004', expected: 'PASS', query: 'is:alchemy game:arena' },
  { id: 'PASS_ADD_005', expected: 'PASS', query: 'is:rebalanced game:arena' },
  { id: 'PASS_ADD_006', expected: 'PASS', query: 'is:boosterfun' },
  { id: 'PASS_ADD_007', expected: 'PASS', query: '-is:boosterfun' },
  { id: 'PASS_ADD_008', expected: 'PASS', query: 'is:commander keywords>=3' },
  { id: 'PASS_ADD_009', expected: 'PASS', query: 't:creature keywords>=2' },
  { id: 'PASS_ADD_010', expected: 'PASS', query: 'eur<1' },
  { id: 'PASS_ADD_011', expected: 'PASS', query: 't:/legendary.*creature/' },
  { id: 'PASS_ADD_012', expected: 'PASS', query: 'o:/^When(ever)?/' },
  { id: 'PASS_ADD_013', expected: 'PASS', query: 'ft:/\\bnight\\b/' },
  { id: 'PASS_ADD_014', expected: 'PASS', query: 'name:/\\bdragon\\b/' },
  { id: 'PASS_ADD_015', expected: 'PASS', query: 'cmc<=2 t:instant' },
  { id: 'PASS_ADD_016', expected: 'PASS', query: 'cmc:even' },

  // Edge cases: Mana symbol searches
  { id: 'EDGE_MANA_001', expected: 'PASS', query: 'm:{W}{U}{B}{R}{G}' },
  { id: 'EDGE_MANA_002', expected: 'PASS', query: 'm:{2}{W}' },
  { id: 'EDGE_MANA_003', expected: 'PASS', query: 'm:{X}{R}{R}' },
  { id: 'EDGE_MANA_004', expected: 'PASS', query: 'm:{C}' },
  { id: 'EDGE_MANA_005', expected: 'PASS', query: 'm:{S}' },
  { id: 'EDGE_MANA_006', expected: 'PASS', query: 'm:{W/U}' },
  { id: 'EDGE_MANA_007', expected: 'PASS', query: 'm:{2/W}' },
  { id: 'EDGE_MANA_008', expected: 'PASS', query: 'm:{W/P}' },
  { id: 'EDGE_MANA_009', expected: 'PASS', query: 'mana>={W}{W}{W}' },
  { id: 'EDGE_MANA_010', expected: 'PASS', query: 'mana<{3}{U}{U}' },

  // Edge cases: Nested parentheses
  {
    id: 'EDGE_PAREN_001',
    expected: 'PASS',
    query: '(t:creature or t:artifact) c:r',
  },
  {
    id: 'EDGE_PAREN_002',
    expected: 'PASS',
    query: 't:creature (c:r or c:g) (mv<=3 or mv>=6)',
  },
  {
    id: 'EDGE_PAREN_003',
    expected: 'PASS',
    query: '((t:goblin or t:elf) c:r) or (t:merfolk c:u)',
  },
  {
    id: 'EDGE_PAREN_004',
    expected: 'PASS',
    query: '-(t:creature or t:planeswalker)',
  },
  {
    id: 'EDGE_PAREN_005',
    expected: 'PASS',
    query: 't:land (produces:w or produces:u) -t:basic',
  },
  {
    id: 'EDGE_PAREN_006',
    expected: 'PASS',
    query: '(o:draw and o:discard) or (o:mill and o:graveyard)',
  },

  // Edge cases: Complex regex patterns
  {
    id: 'EDGE_REGEX_001',
    expected: 'PASS',
    query: 'o:/enter(s|ed)? the battlefield/',
  },
  { id: 'EDGE_REGEX_002', expected: 'PASS', query: 'o:/[0-9]+ damage/' },
  {
    id: 'EDGE_REGEX_003',
    expected: 'PASS',
    query: 'o:/\\+[0-9]+\\/\\+[0-9]+/',
  },
  { id: 'EDGE_REGEX_004', expected: 'PASS', query: 'o:/-[0-9]+\\/-[0-9]+/' },
  { id: 'EDGE_REGEX_005', expected: 'PASS', query: 't:/^legendary creature/' },
  { id: 'EDGE_REGEX_006', expected: 'PASS', query: 'name:/^[aeiou]/i' },
  {
    id: 'EDGE_REGEX_007',
    expected: 'PASS',
    query: 'o:/target (creature|player|opponent)/',
  },

  // Edge cases: Numeric comparisons
  { id: 'EDGE_NUM_001', expected: 'PASS', query: 'pow=* tou=*' },
  { id: 'EDGE_NUM_002', expected: 'PASS', query: 'pow>=tou' },
  { id: 'EDGE_NUM_003', expected: 'PASS', query: 'tou>pow' },
  { id: 'EDGE_NUM_004', expected: 'PASS', query: 'loy>=5' },
  { id: 'EDGE_NUM_005', expected: 'PASS', query: 'mv=0' },
  { id: 'EDGE_NUM_006', expected: 'PASS', query: 'mv!=3' },

  // Edge cases: Negations and exclusions
  { id: 'EDGE_NEG_001', expected: 'PASS', query: '-t:creature -t:land' },
  {
    id: 'EDGE_NEG_002',
    expected: 'PASS',
    query: 't:creature -o:flying -o:trample',
  },
  { id: 'EDGE_NEG_003', expected: 'PASS', query: '-c:u -c:b t:instant' },
  { id: 'EDGE_NEG_004', expected: 'PASS', query: 'c:g -is:reprint' },
  {
    id: 'EDGE_NEG_005',
    expected: 'PASS',
    query: '-is:digital -is:promo t:dragon',
  },

  // Edge cases: Special card properties
  { id: 'EDGE_PROP_001', expected: 'PASS', query: 'is:split' },
  { id: 'EDGE_PROP_002', expected: 'PASS', query: 'is:flip' },
  { id: 'EDGE_PROP_003', expected: 'PASS', query: 'is:transform' },
  { id: 'EDGE_PROP_004', expected: 'PASS', query: 'is:meld' },
  { id: 'EDGE_PROP_005', expected: 'PASS', query: 'is:leveler' },
  { id: 'EDGE_PROP_006', expected: 'PASS', query: 'is:spell' },
  { id: 'EDGE_PROP_007', expected: 'PASS', query: 'is:permanent' },
  { id: 'EDGE_PROP_008', expected: 'PASS', query: 'has:watermark' },

  // Edge cases: Quoted strings with special chars
  { id: 'EDGE_QUOTE_001', expected: 'PASS', query: 'o:"you may"' },
  { id: 'EDGE_QUOTE_002', expected: 'PASS', query: 'o:"~ deals"' },
  { id: 'EDGE_QUOTE_003', expected: 'PASS', query: 'o:"+1/+1 counter"' },
  { id: 'EDGE_QUOTE_004', expected: 'PASS', query: 'o:"can\'t be blocked"' },
  { id: 'EDGE_QUOTE_005', expected: 'PASS', query: 'ft:"end of turn"' },

  // Edge cases: Set and format combinations
  { id: 'EDGE_SET_001', expected: 'PASS', query: 'e:lea or e:leb or e:2ed' },
  { id: 'EDGE_SET_002', expected: 'PASS', query: 'f:vintage -f:legacy' },
  { id: 'EDGE_SET_003', expected: 'PASS', query: 'f:commander legal:vintage' },
  { id: 'EDGE_SET_004', expected: 'PASS', query: 'st:expansion year>=2020' },

  // FAIL cases - should return syntax or regex error
  { id: 'FAIL_REGEX_001', expected: 'FAIL', query: 'o:/[[[invalid/' },
  { id: 'FAIL_UNKNOWN_001', expected: 'FAIL', query: 'unknownkey:value' },
  { id: 'FAIL_REGEX_002', expected: 'FAIL', query: 'o:/unclosed(parenthesis/' },
  { id: 'FAIL_REGEX_003', expected: 'FAIL', query: 'name:/invalid[regex/' },
];

/**
 * Validates a query against Scryfall API.
 * Returns { valid: true } if query parses successfully (status 200 or 404 with no syntax error)
 * Returns { valid: false, error } if query has syntax/regex error (status 400)
 */
async function validateQueryAgainstScryfall(
  query: string,
): Promise<{ valid: boolean; error?: string; status?: number }> {
  const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (response.status === 200) {
      // Query parsed and returned results
      return { valid: true, status: 200 };
    }

    if (response.status === 404) {
      // Query parsed but no results found - still valid syntax
      return { valid: true, status: 404 };
    }

    if (response.status === 400) {
      // Syntax or regex error
      return {
        valid: false,
        status: 400,
        error: data.details || data.warnings?.join(', ') || 'Bad request',
      };
    }

    // Other errors (rate limit, server error, etc.)
    return {
      valid: false,
      status: response.status,
      error: data.details || `HTTP ${response.status}`,
    };
  } catch (e) {
    return {
      valid: false,
      error: e instanceof Error ? e.message : 'Network error',
    };
  }
}

// Rate limit helper - Scryfall allows 10 requests per second
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Scryfall Syntax Validation', () => {
  // Group tests by expected result
  const passCases = TEST_CASES.filter((tc) => tc.expected === 'PASS');
  const failCases = TEST_CASES.filter((tc) => tc.expected === 'FAIL');

  describe('PASS cases - should parse successfully', () => {
    passCases.forEach((testCase, index) => {
      it(`${testCase.id}: ${testCase.query}`, async () => {
        // Rate limiting: wait 150ms between requests
        if (index > 0) await delay(150);

        const result = await validateQueryAgainstScryfall(testCase.query);

        expect(result.valid).toBe(true);
      }, 10000); // 10s timeout per test
    });
  });

  describe('FAIL cases - should return syntax/regex error', () => {
    failCases.forEach((testCase, index) => {
      it(`${testCase.id}: ${testCase.query}`, async () => {
        // Rate limiting: wait 150ms between requests
        if (index > 0) await delay(150);

        const result = await validateQueryAgainstScryfall(testCase.query);

        expect(result.valid).toBe(false);
        expect(result.status).toBe(400);
      }, 10000);
    });
  });
});
