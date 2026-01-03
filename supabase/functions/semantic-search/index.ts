import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Valid Scryfall operators for validation
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

// Validate and sanitize Scryfall query
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
  
  // Remove potentially unsafe characters (keep alphanumeric, spaces, colons, quotes, parentheses, operators)
  sanitized = sanitized.replace(/[^\w\s:="'()<>!+-/*]/g, '');
  
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

// Simplify query for fallback
function simplifyQuery(query: string): string {
  // Remove price constraints
  let simplified = query.replace(/usd[<>=]+\S+/gi, '');
  // Remove complex nested groups
  simplified = simplified.replace(/\([^)]*\([^)]*\)[^)]*\)/g, '');
  // Keep only core terms
  simplified = simplified.replace(/\s+/g, ' ').trim();
  return simplified;
}

// Detect purchase intent for affiliate links
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

    // Build the semantic search prompt
    const systemPrompt = `You are a Scryfall query translator. Your ONLY job is to convert natural language descriptions into valid Scryfall search syntax.

CRITICAL RULES:
1. Output ONLY the Scryfall query string - no explanations, no card names, no formatting
2. ALWAYS include "game:paper" to exclude digital-only cards
3. Prefer BROADER queries when uncertain - it's better to return more results than miss relevant cards
4. "Spells" means ONLY instants and sorceries: (t:instant or t:sorcery)
5. Never fabricate or guess card names, abilities, or mechanics
6. If a term is ambiguous, translate it conservatively

LEGALITY & BAN STATUS (CRITICAL - use these exact syntaxes):
- "banned in X" = banned:X (e.g., "banned in commander" → banned:commander)
- "restricted in X" = restricted:X (e.g., "restricted in vintage" → restricted:vintage)
- "legal in X" = f:X or legal:X (e.g., "legal in modern" → f:modern)
- "not legal in X" = -f:X (e.g., "not legal in standard" → -f:standard)
- DO NOT use "is:banned" - it does not exist. Always use "banned:FORMAT"
- DO NOT use "is:restricted" - it does not exist. Always use "restricted:FORMAT"

MTG SLANG DEFINITIONS:
- "ramp" = cards that accelerate mana, PRIMARILY land-fetching spells like Rampant Growth, Farseek, Kodama's Reach. Use: o:"search" o:"land" (o:"onto the battlefield" or o:"put it onto")
- "ramp spells" = instants/sorceries that search for lands: (t:instant or t:sorcery) o:"search" o:"land"
- "mana dorks" = small creatures that tap for mana: t:creature o:"add" o:"{" mv<=2
- "mana rocks" = artifacts that tap for mana: t:artifact o:"add" o:"{"
- "land ramp" vs "mana rocks" - land ramp searches libraries, rocks are artifacts that tap for mana
- "tutors" = cards that search your library for other cards: o:"search your library"
- "creature tutors" = o:"search your library" o:"creature"
- "land tutors" = o:"search your library" o:"land"
- "removal" = cards that destroy/exile permanents: (o:"destroy target" or o:"exile target")
- "creature removal" = (o:"destroy target creature" or o:"exile target creature")
- "spot removal" = targeted removal, same as removal
- "board wipes" / "wraths" = o:"destroy all" or o:"exile all"
- "finishers" = big game-ending threats: t:creature mv>=6 (pow>=6 or o:"win the game" or o:"extra turn")
- "stax" = cards that tax or restrict opponents: (o:"can't" or o:"pay" o:"or" or o:"each" o:"sacrifice" or o:"skip")
- "pillowfort" = defensive cards discouraging attacks: (o:"can't attack you" or o:"prevent" o:"damage" or o:"protection from")
- "voltron" = cards that buff a single creature: (t:aura or t:equipment or o:"target creature gets" o:"+")
- "blink" / "flicker" = exile and return effects: o:"exile" o:"return" (o:"battlefield" or o:"to the battlefield")
- "reanimator" / "reanimate" = return creatures from graveyard: o:"graveyard" o:"onto the battlefield" t:creature
- "mill" = put cards from library into graveyard: o:"mill" or (o:"library" o:"into" o:"graveyard")
- "discard" = make opponents discard: o:"opponent" o:"discard"
- "draw engines" = repeatable card draw: o:"draw" (o:"whenever" or o:"at the beginning")
- "cantrips" = cheap spells that draw a card: mv<=2 (t:instant or t:sorcery) o:"draw a card"
- "counterspells" = t:instant o:"counter target"
- "sweepers" = same as board wipes
- "anthems" = effects that buff all your creatures: o:"creatures you control get" o:"+"
- "lords" = creatures that buff a tribe: t:creature o:"other" o:"get" o:"+"
- "tokens" = cards that create creature tokens: o:"create" o:"token"
- "sacrifice outlets" / "sac outlets" = free sacrifice effects: o:"sacrifice" (o:":" or o:"0:")
- "aristocrats" = creatures that benefit from deaths: t:creature (o:"whenever" o:"dies" or o:"sacrifice")
- "clone" effects = copy creatures: o:"copy" o:"creature"
- "extra turns" = o:"extra turn"
- "storm" = storm mechanic or storm-like: o:"storm" or o:"copy" o:"for each"
- "wheels" = everyone discards and draws: o:"each player" (o:"discards" o:"draws" or o:"discard" o:"hand")
- "hatebears" = small creatures with taxing effects: t:creature mv<=3 (o:"can't" or o:"opponent" o:"pay")
- "treasure" = cards making treasure tokens: o:"create" o:"treasure"
- "untappers" = cards that untap permanents: o:"untap target"
- "landfall" = triggers when lands enter: o:"landfall" or (o:"whenever a land enters" o:"control")
- "protection" = protection keyword: o:"protection from"
- "indestructible" = o:"indestructible"
- "hexproof" = o:"hexproof"
- "evasion" = creatures hard to block: (o:"flying" or o:"unblockable" or o:"can't be blocked" or o:"menace" or o:"trample")
- "haste enablers" = give creatures haste: o:"creatures" o:"haste"
- "free spells" = o:"without paying" or o:"cast" o:"free"

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
- "secret lair" = e:sld (Secret Lair drops)
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
- "creatures that make treasure" → game:paper t:creature o:"create" o:"treasure"
- "cheap green ramp spells" → game:paper c:g mv<=3 (t:instant or t:sorcery) o:"search" o:"land"
- "green ramp" → game:paper c:g (o:"search" o:"land" or (t:creature o:"add" o:"{"))
- "Rakdos sacrifice outlets" → game:paper c:br o:"sacrifice" o:":"
- "blue counterspells that draw" → game:paper c:u t:instant o:"counter" o:"draw"
- "white board wipes" → game:paper c:w o:"destroy all"
- "lands that tap for any color" → game:paper t:land o:"add" o:"any color"
- "black tutors" → game:paper c:b o:"search your library"
- "white pillowfort cards" → game:paper c:w (o:"can't attack you" or o:"prevent" o:"damage")
- "simic blink effects" → game:paper c:ug o:"exile" o:"return" o:"battlefield"
- "red finishers" → game:paper c:r t:creature mv>=6 pow>=6
- "stax pieces" → game:paper (o:"can't" or o:"pay" o:"or" or o:"each" o:"sacrifice")
- "voltron equipment" → game:paper t:equipment o:"equipped creature gets"
- "reanimation spells" → game:paper (t:instant or t:sorcery) o:"graveyard" o:"onto the battlefield"
- "blue cantrips" → game:paper c:u mv<=2 (t:instant or t:sorcery) o:"draw a card"
- "elf lords" → game:paper t:elf o:"other" o:"elf" o:"+"
- "zombie tribal cards" → game:paper (t:zombie or o:"zombie" o:"you control")
- "dragon finishers" → game:paper t:dragon mv>=5
- "goblin sacrifice synergy" → game:paper t:goblin o:"sacrifice"
- "vampire lifegain" → game:paper t:vampire o:"life"
- "merfolk lords" → game:paper t:merfolk o:"other" o:"merfolk"
- "partner commanders" → game:paper t:legendary t:creature o:"partner"
- "backgrounds" → game:paper t:background
- "experience counter commanders" → game:paper t:legendary t:creature o:"experience counter"
- "CEDH fast mana" → game:paper f:commander t:artifact mv<=2 o:"add" o:"{"
- "free counterspells" → game:paper t:instant o:"counter" o:"without paying"
- "grave pact effects" → game:paper o:"whenever" o:"creature you control dies" o:"sacrifice"
- "mana doublers" → game:paper o:"whenever" o:"tap" o:"for mana" o:"add"
- "fetch lands" → game:paper t:land o:"search your library" o:"land"
- "secret lair cards" → game:paper e:sld
- "borderless planeswalkers" → game:paper is:borderless t:planeswalker
- "commander precon staples" → game:paper is:commander f:commander
- "showcase treatments" → game:paper is:showcase

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
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable. Please try again later.", success: false }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to process search");
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

    // Build explanation
    const assumptions: string[] = [];
    
    // Detect inferred assumptions
    if (!filters?.format && scryfallQuery.includes('f:commander')) {
      assumptions.push('Assumed Commander format based on context');
    }
    if (query.toLowerCase().includes('cheap') || query.toLowerCase().includes('budget')) {
      assumptions.push('Interpreted "cheap/budget" as under $5');
    }
    if (query.toLowerCase().includes('spells') && scryfallQuery.includes('t:instant')) {
      assumptions.push('"Spells" interpreted as instants and sorceries only');
    }
    if (!scryfallQuery.includes('game:paper')) {
      scryfallQuery = 'game:paper ' + scryfallQuery;
      assumptions.push('Added paper game filter');
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
