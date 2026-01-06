/**
 * Semantic Search Edge Function
 * 
 * Translates natural language MTG card searches into Scryfall query syntax
 * using Google Gemini AI via the Lovable AI gateway.
 * 
 * @module semantic-search
 * 
 * ## How It Works
 * 
 * 1. **Input**: Receives a natural language query (e.g., "cheap green ramp spells")
 * 2. **AI Translation**: Sends the query to Gemini with a comprehensive prompt
 *    containing MTG slang definitions, Scryfall syntax rules, and examples
 * 3. **Validation**: Sanitizes the AI output to ensure valid Scryfall syntax
 * 4. **Response**: Returns the translated query with explanation and confidence
 * 
 * ## Request Body
 * ```json
 * {
 *   "query": "creatures that make treasure tokens",
 *   "filters": { "format": "commander", "colorIdentity": ["R", "G"] },
 *   "context": { "previousQuery": "...", "previousScryfall": "..." }
 * }
 * ```
 * 
 * ## Response
 * ```json
 * {
 *   "success": true,
 *   "scryfallQuery": "t:creature o:\"create\" o:\"treasure\"",
 *   "explanation": {
 *     "readable": "Searching for: creatures that make treasure tokens",
 *     "assumptions": [],
 *     "confidence": 0.85
 *   },
 *   "showAffiliate": false
 * }
 * ```
 * 
 * ## Key Features
 * - Extensive MTG slang dictionary (ramp, tutors, stax, etc.)
 * - Tribal/creature type support
 * - Commander-specific terminology
 * - Budget/price-based queries
 * - Follow-up query context for refinements
 * - Purchase intent detection for affiliate links
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Fetches active dynamic translation rules from the database.
 * These rules are generated from user feedback to improve translations.
 */
async function fetchDynamicRules(): Promise<string> {
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return '';
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: rules, error } = await supabase
      .from('translation_rules')
      .select('pattern, scryfall_syntax, description')
      .eq('is_active', true)
      .gte('confidence', 0.6)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (error || !rules || rules.length === 0) {
      return '';
    }
    
    const rulesText = rules.map(r => 
      `- "${r.pattern}" → ${r.scryfall_syntax}${r.description ? ` (${r.description})` : ''}`
    ).join('\n');
    
    return `\n\nDYNAMIC RULES (learned from user feedback - PRIORITIZE these):\n${rulesText}`;
  } catch (e) {
    console.error('Failed to fetch dynamic rules:', e);
    return '';
  }
}

/**
 * Valid Scryfall search operators for query validation.
 * Used to verify AI-generated queries contain legitimate syntax.
 */
const VALID_OPERATORS = [
  'c:', 'c=', 'c<', 'c>', 'c<=', 'c>=',
  'id:', 'id=', 'id<', 'id>', 'id<=', 'id>=',
  'o:', 'oracle:', 't:', 'type:', 
  'm:', 'mana:', 'cmc:', 'cmc=', 'cmc<', 'cmc>', 'cmc<=', 'cmc>=',
  'mv:', 'mv=', 'mv<', 'mv>', 'mv<=', 'mv>=',
  'power:', 'pow:', 'toughness:', 'tou:',
  'loyalty:', 'loy:',
  'e:', 'set:', 's:', 'b:', 'block:',
  'r:', 'rarity:',
  'f:', 'format:', 'legal:',
  'banned:', 'restricted:',
  'is:', 'not:', 'has:',
  'usd:', 'usd<', 'usd>', 'usd<=', 'usd>=',
  'eur:', 'eur<', 'eur>', 'eur<=', 'eur>=',
  'tix:', 'tix<', 'tix>', 'tix<=', 'tix>=',
  'a:', 'artist:', 'ft:', 'flavor:',
  'wm:', 'watermark:', 'border:',
  'frame:', 'game:', 'year:', 'date:',
  'new:', 'prints:', 'lang:', 'in:',
  'st:', 'cube:', 'order:', 'direction:',
  'unique:', 'prefer:', 'include:',
  'produces:', 'devotion:', 'name:'
];

/**
 * Validates and sanitizes a Scryfall query string.
 * Ensures the query is safe to execute and fixes common issues.
 * 
 * @param query - Raw query string from AI
 * @returns Object with validity status, sanitized query, and any issues found
 * 
 * @example
 * validateQuery('t:creature o:"draw') 
 * // { valid: false, sanitized: 't:creature o:"draw"', issues: ['Added missing closing quote'] }
 */
function validateQuery(query: string): { valid: boolean; sanitized: string; issues: string[] } {
  const issues: string[] = [];
  let sanitized = query;
  
  // Remove newlines and extra whitespace
  sanitized = sanitized.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Enforce max length
  if (sanitized.length > 400) {
    sanitized = sanitized.substring(0, 400);
    issues.push('Query truncated to 400 characters');
  }
  
  // Remove potentially unsafe characters (keep common Scryfall syntax + regex for oracle/name searches)
  // Allows: quotes, comparison ops, slashes, regex tokens ([]{}.^$|?\\), and punctuation commonly used in Oracle text.
  sanitized = sanitized.replace(/[^\w\s:="'()<>!=+\-/*\\\[\]{}.,^$|?]/g, '');
  
  // Check for balanced parentheses
  let parenCount = 0;
  for (const char of sanitized) {
    if (char === '(') parenCount++;
    if (char === ')') parenCount--;
    if (parenCount < 0) break;
  }
  if (parenCount !== 0) {
    // Fix unbalanced parentheses by removing all of them
    sanitized = sanitized.replace(/[()]/g, '');
    issues.push('Removed unbalanced parentheses');
  }
  
  // Check for balanced quotes and fix if needed
  const doubleQuoteCount = (sanitized.match(/"/g) || []).length;
  if (doubleQuoteCount % 2 !== 0) {
    // Add closing quote at the end of the last quoted term
    sanitized = sanitized + '"';
    issues.push('Added missing closing quote');
  }
  
  const singleQuoteCount = (sanitized.match(/'/g) || []).length;
  if (singleQuoteCount % 2 !== 0) {
    sanitized = sanitized + "'";
    issues.push('Added missing closing quote');
  }
  
  return { valid: issues.length === 0, sanitized, issues };
}

/**
 * Creates a simplified fallback query by removing complex constraints.
 * Used when the primary query returns no results.
 * 
 * @param query - Original query that may be too restrictive
 * @returns Simplified query with price/complex constraints removed
 */
function simplifyQuery(query: string): string {
  // Remove price constraints
  let simplified = query.replace(/usd[<>=]+\S+/gi, '');
  // Remove complex nested groups
  simplified = simplified.replace(/\([^)]*\([^)]*\)[^)]*\)/g, '');
  // Keep only core terms
  simplified = simplified.replace(/\s+/g, ' ').trim();
  return simplified;
}

/**
 * Detects if the user's query indicates purchase intent.
 * Used to show affiliate links/notices when relevant.
 * 
 * @param query - User's natural language query
 * @returns True if query contains price/purchase-related terms
 * 
 * @example
 * hasPurchaseIntent("cheap green creatures") // true
 * hasPurchaseIntent("best counterspells") // false
 */
function hasPurchaseIntent(query: string): boolean {
  const purchaseTerms = [
    'cheap', 'budget', 'affordable', 'inexpensive', 'low cost',
    'under $', 'under €', 'less than', 'replacement', 'upgrade',
    'buy', 'purchase', 'price', 'worth', 'value'
  ];
  const lowerQuery = query.toLowerCase();
  return purchaseTerms.some(term => lowerQuery.includes(term));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, filters, context } = await req.json();

    // Input validation
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Query is required', success: false }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (query.length > 500) {
      return new Response(JSON.stringify({ error: 'Query too long (max 500 characters)', success: false }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate filters if provided
    const allowedFormats = ['standard', 'pioneer', 'modern', 'legacy', 'vintage', 'commander', 'pauper', 'historic', 'alchemy'];
    if (filters?.format && !allowedFormats.includes(filters.format.toLowerCase())) {
      return new Response(JSON.stringify({ error: 'Invalid format specified', success: false }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (filters?.colorIdentity && (!Array.isArray(filters.colorIdentity) || filters.colorIdentity.length > 5)) {
      return new Response(JSON.stringify({ error: 'Invalid color identity', success: false }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (filters?.maxCmc !== undefined && (typeof filters.maxCmc !== 'number' || filters.maxCmc < 0 || filters.maxCmc > 20)) {
      return new Response(JSON.stringify({ error: 'Invalid max CMC (must be 0-20)', success: false }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build context from previous search if provided
    const contextHint = context ? `\nPrevious search context: The user previously searched for "${context.previousQuery}" which translated to "${context.previousScryfall}". If this new query seems like a follow-up, inherit relevant constraints like colors or format.` : '';

    // Fetch dynamic rules learned from user feedback
    const dynamicRules = await fetchDynamicRules();

    // Build the semantic search prompt
    const systemPrompt = `You are a Scryfall query translator. Your ONLY job is to convert natural language descriptions into valid Scryfall search syntax.

CRITICAL RULES:
1. Output ONLY the Scryfall query string - no explanations, no card names, no formatting
2. Do NOT add game filters unless the user specifically asks for paper/digital cards
3. For ETB (enters the battlefield), ALWAYS use o:"enters" - NEVER use o:"enters the battlefield" as it returns limited results
4. For LTB (leaves the battlefield), ALWAYS use o:"leaves" - NEVER use o:"leaves the battlefield"
5. Prefer BROADER queries when uncertain - it's better to return more results than miss relevant cards
6. "Spells" means ONLY instants and sorceries: (t:instant or t:sorcery)
7. Never fabricate or guess card names, abilities, or mechanics
8. If a term is ambiguous, translate it conservatively
9. HASTE ORACLE TEXT: When user asks for cards that "give haste" / "grant haste" / "haste enablers", use: (o:"gains haste" or o:"have haste" or o:"gain haste")
10. NEVER use "function:" tags - they don't work via the API. Use Oracle text (o:) patterns instead.

LEGALITY & BAN STATUS (CRITICAL - use these exact syntaxes):
- "banned in X" = banned:X (e.g., "banned in commander" → banned:commander)
- "restricted in X" = restricted:X (e.g., "restricted in vintage" → restricted:vintage)
- "legal in X" = f:X or legal:X (e.g., "legal in modern" → f:modern)
- "not legal in X" = -f:X (e.g., "not legal in standard" → -f:standard)
- DO NOT use "is:banned" - it does not exist. Always use "banned:FORMAT"
- DO NOT use "is:restricted" - it does not exist. Always use "restricted:FORMAT"

MTG CONCEPT TO ORACLE TEXT MAPPINGS (use these patterns):
Core Functions - ALWAYS use Oracle text, never function: tags:
- "removal" = (o:"destroy target" or o:"exile target" or o:"deals damage to")
- "creature removal" = (o:"destroy target creature" or o:"exile target creature")
- "ramp" / "mana acceleration" = (o:"add" o:"{" or o:"search your library for" o:"land" or o:"land" o:"onto the battlefield")
- "ramp spells" = (t:instant or t:sorcery) (o:"search" o:"land" or o:"add" o:"mana")
- "mana dorks" = t:creature mv<=2 o:"add" o:"{"
- "mana rocks" = t:artifact o:"add" o:"{"
- "card draw" / "draw cards" = o:"draw" o:"card"
- "tutors" / "search library" = o:"search your library"
- "counterspells" / "counter magic" = t:instant o:"counter target"
- "board wipes" / "wraths" / "mass removal" = (o:"destroy all" or o:"exile all" or o:"deals" o:"damage to each")
- "graveyard hate" / "grave hate" = (o:"exile" o:"graveyard" or o:"exile all cards from")
- "lifegain" / "life gain" = (o:"gain" o:"life" or o:"gains" o:"life")
- "token generators" / "makes tokens" = o:"create" o:"token"
- "sacrifice outlet" / "sac outlet" = o:"sacrifice" o:":"
- "land destruction" = o:"destroy target land"
- "discard" / "hand disruption" = o:"discard" o:"card"
- "mill" = (o:"mill" or o:"into" o:"graveyard" o:"library")
- "blink" / "flicker" = o:"exile" o:"return" o:"battlefield"
- "reanimation" / "reanimate" = o:"graveyard" o:"onto the battlefield"
- "stax" / "tax effects" = (o:"pay" o:"or" or o:"can't" o:"unless")
- "pillowfort" = (o:"can't attack you" or o:"prevent" o:"combat damage")
- "anthem" / "team pump" = o:"creatures you control get" o:"+"
- "lord" / "tribal buff" = t:creature o:"other" o:"get" o:"+"
- "finisher" = t:creature mv>=6 pow>=6

Additional Patterns:
- "treasure" / "treasure tokens" = o:"create" o:"treasure"
- "food" / "food tokens" = o:"create" o:"food"
- "clue" / "clue tokens" = o:"create" o:"clue"
- "copy" / "clone effects" = o:"copy" o:"creature"
- "theft" / "steal effects" = o:"gain control"
- "burn" / "direct damage" = (o:"deals" o:"damage" o:"target") (t:instant or t:sorcery)
- "fog" / "prevent combat damage" = o:"prevent" o:"combat damage"
- "cantrip" = mv<=2 (t:instant or t:sorcery) o:"draw a card"
- "looting" / "loot" = o:"draw" o:"discard"
- "rummage" = o:"discard" o:"draw"
- "wheels" / "wheel effects" = o:"each player" o:"discards" o:"draws"
- "aristocrats" / "death trigger" = t:creature o:"whenever" o:"dies"
- "landfall" = (o:"landfall" or o:"whenever a land enters")
- "proliferate" = o:"proliferate"
- "+1/+1 counter" / "counter synergy" = o:"+1/+1 counter"
- "equipment" = t:equipment
- "aura" = t:aura
- "flash" = o:"flash" or keyword:flash

LAND SHORTCUTS (use these instead of manual Oracle searches):
- "dual lands" = is:dual
- "fetch lands" = is:fetchland
- "shock lands" = is:shockland
- "check lands" = is:checkland
- "pain lands" = is:painland
- "fast lands" = is:fastland
- "slow lands" = is:slowland
- "triomes" / "tri-lands" = is:triome or is:triland
- "bounce lands" / "karoos" = is:bounceland
- "scry lands" = is:scryland
- "filter lands" = is:filterland
- "creature lands" / "man lands" = is:creatureland
- "pathway lands" = is:pathway
- "MDFCs" / "modal lands" = is:mdfc

COMMANDER SHORTCUTS:
- "can be commander" / "legal commanders" = is:commander
- "partner commanders" = is:partner
- "companion" = is:companion
- "backgrounds" = t:background

CARD TYPE SHORTCUTS:
- "vanilla creatures" = is:vanilla
- "french vanilla" = is:frenchvanilla
- "modal spells" = is:modal
- "spells" (cast from hand) = is:spell
- "permanents" = is:permanent
- "historic cards" = is:historic
- "outlaws" = is:outlaw
- "party members" = is:party
- "bears" (2/2 for 2) = is:bear

REGEX SHORTCUTS (Scryfall special syntax):
- \sm = any mana symbol
- \spp = +X/+X pattern (e.g., +2/+2)
- \smm = -X/-X pattern (e.g., -1/-1)
- \spt = X/X power/toughness pattern
- ~ = card's own name (self-reference)

DISPLAY & SORTING (append to queries when relevant):
- "cheapest printing" = add cheapest:usd to query
- "popular cards" / "by popularity" = add order:edhrec
- "newest printings" = add order:released direction:desc
- "by price" = add order:usd direction:desc
- "unique cards only" = add unique:cards
- "all printings" = add unique:prints

PRICE PREFERENCES:
- "cheapest version" = add prefer:usd-low
- "oldest printing" = add prefer:oldest
- "newest printing" = add prefer:newest

FUNDAMENTAL MTG SHORTHAND (ALWAYS interpret these first):
- "ETB" / "etb" = "enters the battlefield" (use o:"enters" - NOT the full phrase which limits results)
- "enters" / "on enter" / "when this enters" / "enter trigger" / "ETB trigger" = o:"enters"
- "LTB" / "ltb" = "leaves the battlefield" (use o:"leaves" - NOT the full phrase)
- "leaves" / "when this leaves" = o:"leaves the battlefield"
- "dies" / "death trigger" / "when this dies" = o:"dies"
- "blink" / "flicker" / "exile and return" = (o:"exile" o:"return" o:"battlefield")
- "bounce" / "return to hand" = o:"return" o:"to" o:"hand"
- "mill" / "deck mill" = (o:"mill" or (o:"into" o:"graveyard"))
- "self mill" = o:"mill"
- "loot" / "draw then discard" = o:"draw" o:"discard"
- "rummage" / "discard then draw" = o:"discard" o:"draw"
- "wheel" / "mass draw" = o:"each player" o:"discards" o:"draws"
- "graveyard" / "GY" / "yard" = o:"graveyard"
- "library" / "deck" = o:"library"
- "tutor" / "search library" = o:"search your library"
- "counter" / "counterspell" = t:instant o:"counter target"
- "mana value" / "MV" / "CMC" = mv: or cmc:
- "ramp" / "mana acceleration" = (o:"add" o:"{" or o:"search" o:"land" o:"battlefield")
- "fixing" / "color fixing" / "mana fixing" = produces: or (o:"add" o:"any color")
- "combat trick" / "pump spell" = t:instant (o:"target creature gets" or o:"+")
- "swing" / "attack" = o:"attack" or o:"attacking"
- "go wide" = o:"create" o:"token"
- "go tall" = pow>=4 or o:"+1/+1 counter"
- "face" / "face damage" = o:"damage" (o:"player" or o:"opponent")
- "card advantage" / "CA" = o:"draw" o:"card"
- "cantrip" = mv<=2 (t:instant or t:sorcery) o:"draw a card"
- "aggro" = mv<=3 pow>=2
- "stax" / "prison" = (o:"can't" or o:"pay" o:"or")
- "voltron" = (t:aura or t:equipment)
- "aristocrats" = t:creature o:"whenever" o:"dies"
- "storm" = o:"storm" or o:"copy" o:"for each"
- "burn" = o:"damage" (o:"any target" or o:"player")
- "double ETB effects" / "ETB doublers" = o:"triggers an additional time"
- "commander" / "EDH" = f:commander
- "removal" = (o:"destroy target" or o:"exile target")

MTG SLANG DEFINITIONS:
- "ramp" = (o:"add" o:"{" or o:"search" o:"land" o:"onto the battlefield")
- "ramp spells" = (t:instant or t:sorcery) (o:"search" o:"land" or o:"add" o:"mana")
- "ramp creatures" = t:creature (o:"add" o:"{" or o:"search" o:"land")
- "mana dorks" = t:creature mv<=2 o:"add" o:"{"
- "mana rocks" = t:artifact o:"add" o:"{"
- "tutors" = o:"search your library"
- "removal" = (o:"destroy target" or o:"exile target")
- "creature removal" = (o:"destroy target creature" or o:"exile target creature")
- "board wipes" / "wraths" = (o:"destroy all" or o:"exile all")
- "finishers" = t:creature mv>=6 pow>=6
- "stax" = (o:"can't" or o:"pay" o:"or")
- "pillowfort" = (o:"can't attack you" or o:"prevent" o:"damage")
- "voltron" = (t:aura or t:equipment)
- "blink" / "flicker" = o:"exile" o:"return" o:"battlefield"
- "reanimator" = o:"graveyard" o:"onto the battlefield"
- "mill" = (o:"mill" or (o:"into" o:"graveyard"))
- "discard" = o:"discard" o:"card"
- "draw engines" = o:"draw" (o:"whenever" or o:"at the beginning")
- "cantrips" = mv<=2 (t:instant or t:sorcery) o:"draw a card"
- "counterspells" = t:instant o:"counter target"
- "anthems" = o:"creatures you control get" o:"+"
- "lords" = t:creature o:"other" o:"get" o:"+"
- "tokens" = o:"create" o:"token"
- "sacrifice outlets" = o:"sacrifice" o:":"
- "aristocrats" = t:creature o:"whenever" o:"dies"
- "clone" effects = o:"copy" o:"creature"
- "extra turns" = o:"extra turn"
- "wheels" = o:"each player" o:"discards" o:"draws"
- "hatebears" = t:creature mv<=3 (o:"can't" or o:"opponent" o:"pay")
- "treasure" = o:"create" o:"treasure"
- "landfall" = (o:"landfall" or o:"whenever a land enters")
- "haste enablers" = (o:"gains haste" or o:"have haste" or o:"gain haste")
- "free spells" = o:"without paying"

TRIBAL TYPES & SYNERGIES:
- "elves" / "elf tribal" = t:elf or o:"elf" o:"you control" (mana production, go-wide, counters)
- "elf lords" = t:elf o:"other" o:"elf" o:"+"
- "goblins" / "goblin tribal" = t:goblin or o:"goblin" o:"you control" (aggro, tokens, sacrifice)
- "goblin lords" = t:goblin o:"other" o:"goblin"
- "zombies" / "zombie tribal" = t:zombie or o:"zombie" o:"you control" (recursion, sacrifice, tokens)
- "zombie lords" = t:zombie o:"other" o:"zombie"
- "vampires" / "vampire tribal" = t:vampire or o:"vampire" o:"you control" (lifegain, +1/+1 counters, aggro)
- "vampire lords" = t:vampire o:"other" o:"vampire"
- "dragons" / "dragon tribal" = t:dragon or o:"dragon" o:"you control" (flying finishers, treasures)
- "dragon lords" = t:dragon o:"other" o:"dragon"
- "angels" / "angel tribal" = t:angel or o:"angel" o:"you control" (flying, lifegain, protection)
- "angel lords" = t:angel o:"other" o:"angel"
- "merfolk" / "merfolk tribal" = t:merfolk or o:"merfolk" o:"you control" (islandwalk, counters, drawing)
- "merfolk lords" = t:merfolk o:"other" o:"merfolk"
- "humans" / "human tribal" = t:human or o:"human" o:"you control" (go-wide, counters, aggro)
- "human lords" = t:human o:"other" o:"human"
- "wizards" / "wizard tribal" = t:wizard or o:"wizard" o:"you control" (spellslinger, cost reduction)
- "wizard lords" = t:wizard o:"other" o:"wizard"
- "warriors" / "warrior tribal" = t:warrior or o:"warrior" o:"you control" (aggro, equipment)
- "rogues" / "rogue tribal" = t:rogue or o:"rogue" o:"you control" (mill, theft, evasion)
- "clerics" / "cleric tribal" = t:cleric or o:"cleric" o:"you control" (lifegain, recursion)
- "shamans" / "shaman tribal" = t:shaman or o:"shaman" o:"you control" (mana, lands)
- "soldiers" / "soldier tribal" = t:soldier or o:"soldier" o:"you control" (tokens, go-wide)
- "knights" / "knight tribal" = t:knight or o:"knight" o:"you control" (equipment, first strike)
- "beasts" / "beast tribal" = t:beast or o:"beast" o:"you control" (power matters, stompy)
- "cats" / "cat tribal" = t:cat or o:"cat" o:"you control" (equipment, lifegain, aggro)
- "dogs" / "dog tribal" = t:dog or o:"dog" o:"you control"
- "dinosaurs" / "dinosaur tribal" = t:dinosaur or o:"dinosaur" o:"you control" (enrage, big creatures)
- "pirates" / "pirate tribal" = t:pirate or o:"pirate" o:"you control" (treasure, evasion)
- "spirits" / "spirit tribal" = t:spirit or o:"spirit" o:"you control" (flying, hexproof, arcane)
- "elementals" / "elemental tribal" = t:elemental or o:"elemental" o:"you control" (evoke, landfall)
- "demons" / "demon tribal" = t:demon or o:"demon" o:"you control" (sacrifice, power)
- "horrors" / "horror tribal" = t:horror (mill, fear, eldrazi-adjacent)
- "eldrazi" = t:eldrazi (annihilator, colorless, exile, big mana)
- "slivers" / "sliver tribal" = t:sliver or o:"sliver" o:"you control" (shared abilities, all types)
- "allies" / "ally tribal" = t:ally or o:"ally" o:"you control" (rally, ETB triggers)
- "faeries" / "faerie tribal" = t:faerie or o:"faerie" o:"you control" (flash, flying, control)
- "treefolk" / "treefolk tribal" = t:treefolk (big toughness, forests matter)
- "rats" / "rat tribal" = t:rat or o:"rat" (discard, swarm)
- "werewolves" / "werewolf tribal" = t:werewolf or o:"werewolf" or t:wolf (transform, night/day)
- "wolves" / "wolf tribal" = t:wolf or o:"wolf"
- "birds" / "bird tribal" = t:bird or o:"bird" (flying, tokens)
- "snakes" / "snake tribal" = t:snake or o:"snake" (deathtouch, counters)
- "spiders" / "spider tribal" = t:spider (reach, deathtouch)
- "artifacts matter" / "artifact creatures" = t:artifact t:creature
- "typal" = same as tribal, use appropriate creature type

COMMANDER-SPECIFIC SLANG:
- "partner" / "partner commanders" = t:legendary t:creature o:"partner" (pair two commanders)
- "partner with" = o:"partner with" (specific partner pairs)
- "backgrounds" = t:background (enchantments that pair with "choose a background" commanders)
- "choose a background" = o:"choose a background" t:legendary t:creature
- "experience counters" = o:"experience counter" (commanders that use experience)
- "command zone" = o:"command zone" (cards that interact with command zone)
- "commander tax" = o:"commander" o:"times" (cards referencing commander cost)
- "commander damage" = o:"commander" o:"combat damage" or o:"commander" o:"dealt damage"
- "CEDH staples" / "cEDH" = f:commander (o:"0:" or mv<=2) (o:"counter" or o:"tutor" or o:"combo" or o:"win")
- "fast mana" = (t:artifact mv<=2 o:"add" o:"{") or o:"mana crypt" or o:"mana vault" or o:"sol ring"
- "mana positive rocks" = t:artifact mv<=2 o:"add" o:"{"
- "free counterspells" = t:instant o:"counter" (o:"without paying" or o:"if" or o:"rather than pay")
- "interaction" = (t:instant or t:sorcery) (o:"counter" or o:"destroy" or o:"exile" or o:"return")
- "protection pieces" = (o:"hexproof" or o:"shroud" or o:"indestructible" or o:"protection from")
- "win conditions" / "wincons" = o:"win the game" or o:"lose the game" or (o:"infinite" and o:"combo")
- "thoracle" / "thassa's oracle" = o:"win the game" o:"library" (oracle consultation combo)
- "consultation" = o:"exile" o:"library" (demonic consultation style)
- "breach lines" = o:"underworld breach" or (o:"graveyard" o:"cast" o:"exile")
- "food chain" = o:"exile" o:"creature" o:"add" o:"mana" (food chain combo)
- "dramatic scepter" = (o:"isochron scepter" or o:"dramatic reversal" or (o:"copy" o:"instant" o:"untap"))
- "infinite mana" = o:"untap" o:"add" (infinite mana combos)
- "aristocrat combos" = t:creature o:"whenever" o:"dies" o:"each opponent"
- "blood artist effects" = t:creature o:"whenever" o:"dies" o:"loses" o:"life"
- "altar effects" = t:artifact o:"sacrifice" o:"add" o:"{"
- "flicker combo" = o:"exile" o:"return" o:"battlefield" o:"end"
- "combat tricks" = t:instant (o:"target creature gets" or o:"indestructible" or o:"hexproof")
- "political cards" = o:"each opponent" o:"vote" or o:"goad" or o:"monarch"
- "goad" = o:"goad" (force creatures to attack)
- "monarch" = o:"monarch" (monarch mechanic)
- "initiative" = o:"initiative" or o:"undercity" (initiative/dungeon)
- "dungeons" = o:"venture" or o:"dungeon" or o:"completed a dungeon"
- "saga" = t:saga (saga enchantments)
- "mutate" = o:"mutate" (mutate mechanic)
- "cascade" = o:"cascade" (cascade mechanic)
- "storm count" = o:"storm" or o:"for each spell cast"
- "magecraft" = o:"magecraft" or (o:"whenever you cast" o:"instant or sorcery")
- "heroic" = o:"heroic" or (o:"whenever you cast" o:"targets")
- "constellation" = o:"constellation" or (o:"whenever" o:"enchantment enters")
- "landfall payoffs" = o:"landfall" (o:"+" or o:"create" or o:"draw" or o:"damage")
- "cost reducers" = o:"cost" (o:"less" or o:"reduce") o:"to cast"
- "mana doublers" = o:"whenever" o:"tap" o:"for mana" o:"add" or o:"double"
- "damage doublers" = o:"damage" o:"double" or o:"deals double"
- "token doublers" = o:"create" o:"token" o:"double" or o:"twice that many"
- "grave pact effects" = o:"whenever" o:"creature you control dies" o:"sacrifice"
- "skullclamp" = t:equipment o:"dies" o:"draw"
- "signets" = t:artifact o:"add" o:"one mana of" (mana fixing artifacts)
- "talismans" = t:artifact o:"add" o:"or" o:"1 damage" (talisman cycle)
- "fetch lands" = t:land o:"search your library" o:"land"
- "shock lands" = t:land o:"pay 2 life" o:"tapped"
- "dual lands" = t:land (o:"plains" o:"island" o:"swamp" o:"mountain" o:"forest")
- "bounce lands" = t:land o:"return a land" o:"untapped"
- "MDFCs" / "modal lands" = t:land is:mdfc (modal double-faced cards)
- "utility lands" = t:land -t:basic (o:":" or o:"activated")

PRECON & PRODUCT SLANG:
- "precon" / "precon commanders" = is:commander t:legendary t:creature
- "starter deck" = st:starter (starter deck products)
- "secret lair" = e:sld (Secret Lair drops - see SECRET LAIR SPECIFIC DROPS for themed searches)
- "collector booster" = is:extendedart or is:borderless or is:showcase (collector booster exclusives)
- "box toppers" = is:boxtopper (box topper promos)
- "buy-a-box" = is:buyabox (buy-a-box promos)
- "bundle promo" = is:bundle (bundle exclusive cards)
- "promo" / "promos" = is:promo (any promotional card)
- "foil only" = is:foilonly (cards only available in foil)
- "nonfoil only" = is:nonfoilonly (cards only available in nonfoil)
- "masterpiece" = is:masterpiece (masterpiece series cards)
- "expedition" / "expeditions" = e:exp (Zendikar Expeditions)
- "invention" / "inventions" = e:mps (Kaladesh Inventions)
- "invocation" / "invocations" = e:mp2 (Amonkhet Invocations)
- "retro frame" / "old border" = frame:1997 or frame:2003 (old border cards)
- "modern frame" = frame:2015 (modern frame cards)
- "showcase" = is:showcase (showcase frame treatments)
- "borderless" = is:borderless (borderless card treatments)
- "extended art" = is:extendedart (extended art treatments)
- "full art" = is:fullart (full art cards)
- "full art lands" = t:basic is:fullart (full art basic lands)
- "textless" = is:textless (textless promos)
- "serialized" = is:serialized (serialized numbered cards)
- "commander collection" = e:cc1 or e:cc2 (Commander Collection products)
- "signature spellbook" = e:ss1 or e:ss2 or e:ss3 (Signature Spellbook series)
- "from the vault" = e:v09 or e:v10 or e:v11 or e:v12 or e:v13 or e:v14 or e:v15 or e:v16 or e:v17 (From the Vault series)
- "game night" = e:gn2 or e:gn3 (Game Night products)
- "jumpstart" = e:jmp or e:j21 or e:j22 (Jumpstart products)
- "mystery booster" = e:mb1 or e:mb2 or e:fmb1 (Mystery Booster cards)
- "the list" = in:plist (The List reprints)
- "universes beyond" = is:extra -is:funny (non-Magic IP crossovers - use set codes for specific UB)
- "commander deck" / "commander precon" = st:commander (Commander precon products)
- "duel deck" = st:duel_deck (Duel Deck products)
- "planechase" = e:pc2 or e:pca (Planechase products)
- "archenemy" = e:arc or e:e01 (Archenemy products)
- "conspiracy" = e:cns or e:cn2 (Conspiracy sets)
- "battlebond" = e:bbd (Battlebond)
- "unfinity" = e:unf (Unfinity)
- "unstable" = e:ust (Unstable)
- "unhinged" = e:unh (Unhinged)
- "unglued" = e:ugl (Unglued)
- "sticker cards" = o:"sticker" (Unfinity stickers)
- "attraction cards" = t:attraction (Unfinity attractions)
- "commander masters" = e:cmm (Commander Masters)
- "double masters" = e:2xm or e:2x2 (Double Masters sets)
- "modern masters" = e:mma or e:mm2 or e:mm3 (Modern Masters sets)
- "eternal masters" = e:ema (Eternal Masters)
- "iconic masters" = e:ima (Iconic Masters)
- "ultimate masters" = e:uma (Ultimate Masters)

SECRET LAIR SPECIFIC DROPS (CRITICAL - use correct search patterns for themed drops):
When users ask for cards from a specific Secret Lair, use the appropriate search method.
Art tags (art:) search Scryfall's tagger database. Artist names (a:) are more reliable for artist series.
IMPORTANT: Art tag naming is inconsistent - try BOTH with and without "-universe" suffix using OR.

=== VIDEO GAME COLLABORATIONS (use art tags) ===
- "sonic secret lair" / "sonic the hedgehog" = e:sld (art:sonic-the-hedgehog OR art:sonic-the-hedgehog-universe)
- "god of war secret lair" / "kratos" = e:sld (art:god-of-war OR art:god-of-war-universe)
- "last of us secret lair" / "ellie and joel" = e:sld (art:the-last-of-us OR art:last-of-us OR art:the-last-of-us-universe)
- "uncharted secret lair" / "nathan drake" = e:sld (art:uncharted OR art:uncharted-universe)
- "street fighter secret lair" / "ryu chun-li" = e:sld (art:street-fighter OR art:street-fighter-universe)
- "fortnite secret lair" = e:sld (art:fortnite OR art:fortnite-universe)
- "tomb raider secret lair" / "lara croft" = e:sld (art:tomb-raider OR art:tomb-raider-universe)
- "hatsune miku secret lair" / "miku" = e:sld (art:hatsune-miku OR art:hatsune-miku-universe)
- "final fantasy secret lair" = e:sld (art:final-fantasy OR art:final-fantasy-universe)

=== TV/MOVIE COLLABORATIONS (use art tags) ===
- "stranger things secret lair" / "eleven" = e:sld (art:stranger-things OR art:stranger-things-universe)
- "walking dead secret lair" / "negan" = e:sld (art:walking-dead OR art:the-walking-dead OR art:the-walking-dead-universe)
- "arcane secret lair" / "jinx vi" = e:sld (art:arcane OR art:arcane-universe)
- "princess bride secret lair" / "westley buttercup" = e:sld (art:princess-bride OR art:the-princess-bride OR art:the-princess-bride-universe)
- "transformers secret lair" / "optimus megatron" = e:sld (art:transformers OR art:transformers-universe)
- "jurassic world secret lair" / "jurassic park" = e:sld (art:jurassic-world OR art:jurassic-park OR art:jurassic-world-universe)
- "doctor who secret lair" / "tardis" = e:sld (art:doctor-who OR art:doctor-who-universe)
- "the office secret lair" / "dwight" = e:sld (art:the-office OR art:the-office-universe)
- "jaws secret lair" = e:sld (art:jaws OR art:jaws-universe)
- "godzilla secret lair" = e:sld (art:godzilla OR is:godzilla)

=== MUSIC/ARTIST COLLABORATIONS ===
- "post malone secret lair" = e:sld art:post-malone
- "iron maiden secret lair" = e:sld (art:iron-maiden OR art:iron-maiden-universe)

=== ANIME/MANGA COLLABORATIONS ===
- "attack on titan secret lair" / "eren mikasa" = e:sld (art:attack-on-titan OR art:attack-on-titan-universe)
- "junji ito secret lair" = e:sld a:"Junji Ito"

=== WARHAMMER COLLABORATIONS ===
- "warhammer secret lair" / "warhammer 40k" = e:sld (art:warhammer OR art:warhammer-40000)
- "warhammer age of sigmar" = e:sld art:age-of-sigmar
- "blood bowl secret lair" = e:sld art:blood-bowl

=== COMEDY/PARODY ===
- "monty python secret lair" / "killer rabbit" / "holy grail" = e:sld (art:monty-python OR art:monty-python-universe)
- "spongebob secret lair" / "spongebob squarepants" = e:sld (art:spongebob OR art:spongebob-squarepants OR art:spongebob-universe)

=== ARTIST SECRET LAIRS (use a: for artist name - MOST RELIABLE) ===
Classic MTG Artists:
- "bob ross secret lair" / "happy little gathering" = e:sld a:"Bob Ross"
- "seb mckinnon secret lair" = e:sld a:"Seb McKinnon"
- "rebecca guay secret lair" = e:sld a:"Rebecca Guay"
- "dan frazier secret lair" / "foil talismans" / "talismans secret lair" = e:sld a:"Dan Frazier"
- "mark poole secret lair" = e:sld a:"Mark Poole"
- "thomas baxa secret lair" = e:sld a:"Thomas Baxa"
- "johannes voss secret lair" = e:sld a:"Johannes Voss"
- "wayne reynolds secret lair" = e:sld a:"Wayne Reynolds"
- "volkan baga secret lair" = e:sld a:"Volkan Baga"
- "chris rahn secret lair" = e:sld a:"Chris Rahn"
- "magali villeneuve secret lair" = e:sld a:"Magali Villeneuve"
- "nils hamm secret lair" = e:sld a:"Nils Hamm"
- "livia prima secret lair" = e:sld a:"Livia Prima"
- "victor adame minguez secret lair" = e:sld a:"Victor Adame Minguez"
- "aleksi briclot secret lair" = e:sld a:"Aleksi Briclot"
- "sidharth chaturvedi secret lair" = e:sld a:"Sidharth Chaturvedi"
- "ron spencer secret lair" = e:sld a:"Ron Spencer"
- "phil foglio secret lair" = e:sld a:"Phil Foglio"
- "pete venters secret lair" = e:sld a:"Pete Venters"
- "adam paquette secret lair" = e:sld a:"Adam Paquette"
- "igor kieryluk secret lair" = e:sld a:"Igor Kieryluk"
- "jesper ejsing secret lair" = e:sld a:"Jesper Ejsing"
- "chase stone secret lair" = e:sld a:"Chase Stone"
- "jake murray secret lair" = e:sld a:"Jake Murray"
- "scott m fischer secret lair" = e:sld a:"Scott M. Fischer"
- "heather hudson secret lair" = e:sld a:"Heather Hudson"
- "dave allsop secret lair" = e:sld a:"Dave Allsop"

Guest/External Artists:
- "fiona staples secret lair" = e:sld a:"Fiona Staples"
- "jen bartel secret lair" = e:sld a:"Jen Bartel"
- "yuko shimizu secret lair" = e:sld a:"Yuko Shimizu"
- "yoji shinkawa secret lair" = e:sld a:"Yoji Shinkawa"
- "frank frazetta secret lair" = e:sld a:"Frank Frazetta"
- "kozyndan secret lair" = e:sld a:"Kozyndan"
- "kelogsloops secret lair" = e:sld a:"Kelogsloops"
- "matt jukes secret lair" = e:sld a:"Matt Jukes"
- "omar rayyan secret lair" = e:sld a:"Omar Rayyan"
- "bakshi productions secret lair" / "ralph bakshi" = e:sld a:"Bakshi Productions"
- "erol otus secret lair" = e:sld a:"Erol Otus"
- "craig drake secret lair" = e:sld a:"Craig Drake"

=== THEMED/DROP NAME SECRET LAIRS ===
Creature Type Themes:
- "cat secret lair" / "omg kitties" / "purrfection" = e:sld t:cat
- "dog secret lair" / "every dog has its day" = e:sld t:dog
- "goblin secret lair" = e:sld t:goblin
- "squirrel secret lair" = e:sld t:squirrel
- "faerie secret lair" / "faerie rad" = e:sld t:faerie
- "dragon secret lair" / "here be dragons" = e:sld t:dragon
- "slime secret lair" / "prime slime" = e:sld (t:ooze OR o:ooze)
- "snake secret lair" / "ssssnakes" = e:sld t:snake
- "rat secret lair" / "year of the rat" = e:sld t:rat

Named Drops (search by drop name keywords):
- "bitterblossom dreams" = e:sld Bitterblossom
- "phyrexian secret lair" / "phyrexian praetors" / "phyrexian faves" = e:sld (is:phyrexian OR o:phyrexian OR t:phyrexian)
- "pride secret lair" / "pride across the multiverse" = e:sld art:pride
- "theros stargazing" / "stargazing secret lair" = e:sld (art:stargazing OR art:theros-stargazing)
- "kamigawa ink" = e:sld art:kamigawa-ink
- "dracula secret lair" / "castle dracula" = e:sld (art:dracula OR art:castle-dracula)
- "pixel lands" / "pixel snow lands" = e:sld art:pixel
- "astrology lands" / "zodiac lands" = e:sld art:astrology
- "tokyo lands" = e:sld art:tokyo-lands
- "full text lands" = e:sld art:full-text
- "showcase kaldheim" = e:sld art:showcase-kaldheim
- "showcase strixhaven" = e:sld art:showcase-strixhaven
- "showcase zendikar" = e:sld art:showcase-zendikar
- "showcase midnight hunt" = e:sld art:showcase-midnight-hunt
- "showcase neon dynasty" = e:sld art:showcase-neon-dynasty
- "showcase dominaria united" = e:sld art:showcase-dominaria-united
- "showcase streets of new capenna" = e:sld art:showcase-streets-of-new-capenna
- "lil walkers" / "li'l walkers" / "chibi planeswalkers" = e:sld art:lil-walkers
- "saturday morning dnd" / "saturday morning d&d" = e:sld art:saturday-morning
- "extra life secret lair" = e:sld art:extra-life
- "black is magic" = e:sld art:black-is-magic
- "international womens day" = e:sld art:international-womens-day
- "secretversary" = e:sld art:secretversary

=== FALLBACK STRATEGIES ===
For unknown Secret Lair drops:
1. Try art tag: e:sld (art:[name-with-hyphens] OR art:[name-with-hyphens]-universe)
2. Try artist name: e:sld a:"Artist Name"
3. Try card name keywords: e:sld "keyword from drop"
4. Generic SLD search: e:sld [theme/keyword]

RESERVED LIST & SPECIAL STATUS:
- "reserved list" / "RL cards" = is:reserved (cards on the Reserved List)
- "reserved list under $X" = is:reserved usd<X
- "reprint" = is:reprint (cards that have been reprinted)
- "first printing" = is:firstprint or not:reprint (original printings only)
- "unique art" = unique:art (cards with unique art)
- "unique prints" = unique:prints (unique printings)

POWER/TOUGHNESS SEARCHES:
- "big creatures" = pow>=5 or tou>=5
- "creatures with power greater than toughness" = pow>tou
- "creatures with toughness greater than power" = tou>pow
- "X/X creatures" = pow=X tou=X (replace X with number)
- "power 0" = pow=0
- "0 power creatures" = t:creature pow=0

COLOR IDENTITY (for Commander):
CRITICAL - Always use explicit comparison operators. Avoid bare id:.

- id=XY... = EXACT identity (exactly these colors, no fewer, no more). Example: id=rg returns only red-green identity cards (NOT mono-red).
- id<=XY... = WITHIN this identity (subsets allowed; playable with that commander). Example: id<=rg includes mono-red, mono-green, colorless, AND red-green.
- id>=XY... = INCLUDES this identity (must include these colors; can include more). Example: id>=rg includes RG, WRG, URG, BRG, WURG, etc.

Default interpretation:
- If user names a color group ("gruul", "esper", "abzan", etc.), they mean EXACTLY those colors → use id=.
- If user explicitly says "playable in X deck", "within X identity", or "X commander deck" → use id<=.

GUILD NAMES (2-color pairs) - default to id=:
- "azorius" = id=wu (white-blue)
- "dimir" = id=ub (blue-black)
- "rakdos" = id=br (black-red)
- "gruul" = id=rg (red-green)
- "selesnya" = id=gw (green-white)
- "orzhov" = id=wb (white-black)
- "izzet" = id=ur (blue-red)
- "golgari" = id=bg (black-green)
- "boros" = id=rw (red-white)
- "simic" = id=ug (blue-green)

SHARD NAMES (3-color allied) - default to id=:
- "bant" = id=wug (white-blue-green)
- "esper" = id=wub (white-blue-black)
- "grixis" = id=ubr (blue-black-red)
- "jund" = id=brg (black-red-green)
- "naya" = id=wrg (white-red-green)

WEDGE NAMES (3-color enemy) - default to id=:
- "abzan" / "junk" = id=wbg (white-black-green)
- "jeskai" / "america" = id=wur (white-blue-red)
- "sultai" / "bug" = id=ubg (blue-black-green)
- "mardu" = id=wbr (white-black-red)
- "temur" / "rug" = id=urg (blue-red-green)

4-COLOR NAMES - default to id=:
- "glint-eye" / "chaos" / "sans-white" / "non-white" = id=ubrg
- "dune-brood" / "aggression" / "sans-blue" / "non-blue" = id=wbrg
- "ink-treader" / "altruism" / "sans-black" / "non-black" = id=wurg
- "witch-maw" / "growth" / "sans-red" / "non-red" = id=wubg
- "yore-tiller" / "artifice" / "sans-green" / "non-green" = id=wubr

Mono-color:
- "mono white" = id=w or c=w
- "mono blue" = id=u or c=u
- "mono black" = id=b or c=b
- "mono red" = id=r or c=r
- "mono green" = id=g or c=g
- "colorless" = c=c or id=c (no colors/colorless identity)
- "exactly two colors" = c=2 (exactly 2 colors)
- "three or more colors" = c>=3
- "five color" / "WUBRG" = c=wubrg or id=wubrg

QUERY TRANSLATION EXAMPLES:
- "creatures that make treasure" → t:creature o:"create" o:"treasure"
- "cheap green ramp spells" → c:g mv<=3 (t:instant or t:sorcery) o:"search" o:"land"
- "green ramp" → c:g (o:"search" o:"land" or (t:creature o:"add" o:"{"))
- "Rakdos sacrifice outlets" → id=br o:"sacrifice" o:":"
- "blue counterspells that draw" → c:u t:instant o:"counter" o:"draw"
- "white board wipes" → c:w o:"destroy all"
- "lands that tap for any color" → t:land o:"add" o:"any color"
- "black tutors" → c:b o:"search your library"
- "white pillowfort cards" → c:w (o:"can't attack you" or o:"prevent" o:"damage")
- "simic blink effects" → id=ug o:"exile" o:"return" o:"battlefield"
- "gruul haste enablers" → id=rg o:/(creatures you control|other creatures you control) (have|gain) haste([.]| until| as| while|$)/
- "gruul legendary creatures that give haste" → id=rg t:legendary t:creature o:/(creatures you control|other creatures you control) (have|gain) haste([.]| until| as| while|$)/
- "sultai graveyard" → id=ubg o:"graveyard"
- "red finishers" → c:r t:creature mv>=6 pow>=6
- "stax pieces" → (o:"can't" or o:"pay" o:"or" or o:"each" o:"sacrifice")
- "voltron equipment" → t:equipment o:"equipped creature gets"
- "reanimation spells" → (t:instant or t:sorcery) o:"graveyard" o:"onto the battlefield"
- "blue cantrips" → c:u mv<=2 (t:instant or t:sorcery) o:"draw a card"
- "elf lords" → t:elf o:"other" o:"elf" o:"+"
- "zombie tribal cards" → (t:zombie or o:"zombie" o:"you control")
- "dragon finishers" → t:dragon mv>=5
- "goblin sacrifice synergy" → t:goblin o:"sacrifice"
- "vampire lifegain" → t:vampire o:"life"
- "merfolk lords" → t:merfolk o:"other" o:"merfolk"
- "partner commanders" → t:legendary t:creature o:"partner"
- "backgrounds" → t:background
- "experience counter commanders" → t:legendary t:creature o:"experience counter"
- "CEDH fast mana" → f:commander t:artifact mv<=2 o:"add" o:"{"
- "free counterspells" → t:instant o:"counter" o:"without paying"
- "grave pact effects" → o:"whenever" o:"creature you control dies" o:"sacrifice"
- "mana doublers" → o:"whenever" o:"tap" o:"for mana" o:"add"
- "fetch lands" → t:land o:"search your library" o:"land"
- "secret lair cards" → e:sld
- "borderless planeswalkers" → is:borderless t:planeswalker
- "commander precon staples" → is:commander f:commander
- "showcase treatments" → is:showcase

SET & UNIVERSE CODES:
- Avatar/ATLA: e:tla
- Final Fantasy: e:fin
- Lord of the Rings/LOTR: e:ltr
- Warhammer 40k: e:40k
- Doctor Who: e:who
- Fallout: e:pip

FORMAT LEGALITY:
- Commander/EDH: f:commander
- Modern: f:modern
- Standard: f:standard

BUDGET TRANSLATIONS:
- "cheap" or "budget": usd<5
- "very cheap": usd<1
- "expensive": usd>20
${contextHint}
${dynamicRules}

Remember: Return ONLY the Scryfall query. No explanations. No card suggestions.`;

    const userMessage = `Translate to Scryfall syntax: "${query}"${filters?.format ? ` (format: ${filters.format})` : ''}${filters?.colorIdentity?.length ? ` (colors: ${filters.colorIdentity.join('')})` : ''}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.2,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment.", success: false }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // Fallback: AI gateway unavailable (402, 500, etc.) - pass query directly to Scryfall
      // Apply basic transformations for common patterns
      console.warn("AI gateway unavailable, using fallback:", response.status);
      
      let fallbackQuery = query.trim();
      
      // Apply basic keyword transformations
      const basicTransforms: [RegExp, string][] = [
        [/\betb\b/gi, 'o:"enters"'],
        [/\bltb\b/gi, 'o:"leaves"'],
        [/\bramp\b/gi, '(o:"add" o:"{" or o:"search" o:"land")'],
        [/\btutors?\b/gi, 'o:"search your library"'],
        [/\bboard ?wipes?\b/gi, 'o:"destroy all"'],
        [/\bwraths?\b/gi, 'o:"destroy all"'],
        [/\bcounterspells?\b/gi, 't:instant o:"counter target"'],
        [/\bcounter ?magic\b/gi, 't:instant o:"counter target"'],
        [/\bcard draw\b/gi, 'o:"draw" o:"card"'],
        [/\bdraw cards?\b/gi, 'o:"draw" o:"card"'],
        [/\bremoval\b/gi, '(o:"destroy target" or o:"exile target")'],
        [/\btreasure tokens?\b/gi, 'o:"create" o:"treasure"'],
        [/\bmakes? treasure\b/gi, 'o:"create" o:"treasure"'],
        [/\btoken generators?\b/gi, 'o:"create" o:"token"'],
        [/\bmakes? tokens?\b/gi, 'o:"create" o:"token"'],
        [/\blifegain\b/gi, 'o:"gain" o:"life"'],
        [/\bgraveyard hate\b/gi, 'o:"exile" o:"graveyard"'],
        [/\breanimation\b/gi, 'o:"graveyard" o:"onto the battlefield"'],
        [/\breanimate\b/gi, 'o:"graveyard" o:"onto the battlefield"'],
        [/\bblink\b/gi, 'o:"exile" o:"return" o:"battlefield"'],
        [/\bflicker\b/gi, 'o:"exile" o:"return" o:"battlefield"'],
        [/\bstax\b/gi, '(o:"can\'t" or o:"pay" o:"or")'],
        [/\bmana rocks?\b/gi, 't:artifact o:"add" o:"{"'],
        [/\bmana dorks?\b/gi, 't:creature o:"add" o:"{"'],
        [/\bspells\b/gi, '(t:instant or t:sorcery)'],
        [/\bcheap\b/gi, 'usd<5'],
        [/\bbudget\b/gi, 'usd<5'],
        [/\bexpensive\b/gi, 'usd>20'],
      ];
      
      // Check if query already looks like Scryfall syntax
      const looksLikeScryfall = /[a-z]+[:=<>]/.test(fallbackQuery);
      
      if (!looksLikeScryfall) {
        for (const [pattern, replacement] of basicTransforms) {
          fallbackQuery = fallbackQuery.replace(pattern, replacement);
        }
      }
      
      // Apply filters
      if (filters?.format) {
        fallbackQuery += ` f:${filters.format}`;
      }
      if (filters?.colorIdentity?.length) {
        fallbackQuery += ` id=${filters.colorIdentity.join('').toLowerCase()}`;
      }
      
      const fallbackValidation = validateQuery(fallbackQuery);
      
      return new Response(JSON.stringify({
        originalQuery: query,
        scryfallQuery: fallbackValidation.sanitized,
        explanation: {
          readable: `Searching for: ${query}`,
          assumptions: ['Using simplified translation (AI temporarily unavailable)'],
          confidence: 0.6
        },
        showAffiliate: hasPurchaseIntent(query),
        success: true,
        fallback: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    let scryfallQuery = data.choices?.[0]?.message?.content?.trim() || '';

    // Clean up the query (remove any markdown or extra formatting)
    scryfallQuery = scryfallQuery
      .replace(/```[a-z]*\n?/g, '')
      .replace(/`/g, '')
      .replace(/^["']|["']$/g, '')
      .trim();

    // Validate and sanitize
    const validation = validateQuery(scryfallQuery);
    scryfallQuery = validation.sanitized;

    // Build explanation based on what the query ACTUALLY contains
    const assumptions: string[] = [];
    
    // Detect what the AI actually did based on the generated query
    if (!filters?.format && scryfallQuery.includes('f:commander')) {
      assumptions.push('Assumed Commander format based on context');
    }
    
    // Check how "cheap/budget" was interpreted by looking at the actual query
    if (query.toLowerCase().includes('cheap') || query.toLowerCase().includes('budget')) {
      if (scryfallQuery.includes('usd<') || scryfallQuery.includes('usd<=')) {
        const priceMatch = scryfallQuery.match(/usd[<>=]+(\d+)/);
        assumptions.push(`Interpreted "cheap/budget" as under $${priceMatch?.[1] || '5'}`);
      } else if (scryfallQuery.match(/mv[<>=]+\d/)) {
        const mvMatch = scryfallQuery.match(/mv[<>=]+(\d+)/);
        assumptions.push(`Interpreted "cheap" as low mana value (≤${mvMatch?.[1] || '3'})`);
      } else if (scryfallQuery.match(/cmc[<>=]+\d/)) {
        const cmcMatch = scryfallQuery.match(/cmc[<>=]+(\d+)/);
        assumptions.push(`Interpreted "cheap" as low mana cost (≤${cmcMatch?.[1] || '3'})`);
      }
    }
    
    if (query.toLowerCase().includes('spells') && scryfallQuery.includes('t:instant')) {
      assumptions.push('"Spells" interpreted as instants and sorceries only');
    }
    
    if (query.toLowerCase().includes('ramp') && scryfallQuery.includes('o:"search"') && scryfallQuery.includes('o:"land"')) {
      assumptions.push('"Ramp" interpreted as land-searching effects');
    }
    

    // Calculate confidence (simple heuristic)
    let confidence = 0.85;
    if (query.split(' ').length <= 3) confidence = 0.95;
    if (query.split(' ').length > 10) confidence = 0.7;
    if (validation.issues.length > 0) confidence -= 0.1;
    confidence = Math.max(0.5, Math.min(1, confidence));

    // Detect purchase intent
    const showAffiliate = hasPurchaseIntent(query);

    console.log("Search translated:", query, "→", scryfallQuery);

    return new Response(JSON.stringify({ 
      originalQuery: query,
      scryfallQuery,
      explanation: {
        readable: `Searching for: ${query}`,
        assumptions,
        confidence: Math.round(confidence * 100) / 100
      },
      showAffiliate,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Semantic search error:", error);
    return new Response(JSON.stringify({ 
      error: "Something went wrong. Please try rephrasing your search.",
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
