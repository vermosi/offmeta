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
