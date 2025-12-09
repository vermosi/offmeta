import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, filters } = await req.json();

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

    // Build the semantic search prompt
    const systemPrompt = `You are an expert Magic: The Gathering card search assistant. Your job is to translate natural language queries into Scryfall search syntax.

Given a user's natural language query about MTG cards, you must:
1. Understand the intent and meaning behind the query
2. Translate it into valid Scryfall search syntax
3. Return ONLY the Scryfall query string, nothing else

Examples:
- "cards that double ETB effects" → o:"whenever" o:"enters" (o:"double" or o:"twice" or o:"additional")
- "Rakdos sac outlets without mana costs" → c:br o:"sacrifice" -o:"{" t:creature
- "cheap green ramp spells" → c:g cmc<=2 (o:"add" o:"mana" or o:"search" o:"land")
- "blue counterspells that draw cards" → c:u o:"counter" o:"draw"
- "creatures that make treasure tokens" → t:creature o:"create" o:"treasure"
- "graveyard recursion in black" → c:b (o:"return" o:"graveyard" or o:"reanimate")
- "white board wipes" → c:w o:"destroy all" 
- "lands that tap for any color" → t:land o:"add" o:"any color"
- "enchantments that double damage" → t:enchantment (o:"double" o:"damage" or o:"deals twice")
- "artifacts that reduce costs" → t:artifact (o:"cost" o:"less" or o:"reduce")

Format restrictions (add if mentioned):
- Commander/EDH legal: f:commander
- Modern legal: f:modern
- Standard legal: f:standard
- Pioneer legal: f:pioneer

Color identity filters (use 'c:' for color, 'id:' for commander identity):
- Only use 'id:' when user mentions commander/EDH identity
- Use 'c:' for regular color matching

Budget considerations:
- Cheap/budget cards: usd<5
- Very cheap: usd<1
- Expensive: usd>20

Remember: Return ONLY the Scryfall query, no explanation or formatting.`;

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
          { role: "user", content: `Translate this natural language MTG card search to Scryfall syntax: "${query}"${filters?.format ? ` (for ${filters.format} format)` : ''}${filters?.colorIdentity?.length ? ` (colors: ${filters.colorIdentity.join('')})` : ''}${filters?.maxCmc ? ` (max mana value: ${filters.maxCmc})` : ''}` }
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to process semantic search");
    }

    const data = await response.json();
    const scryfallQuery = data.choices?.[0]?.message?.content?.trim() || query;

    // Clean up the query (remove any markdown or extra formatting)
    const cleanQuery = scryfallQuery
      .replace(/```[a-z]*\n?/g, '')
      .replace(/`/g, '')
      .trim();

    console.log("Semantic search:", query, "→", cleanQuery);

    return new Response(JSON.stringify({ 
      originalQuery: query,
      scryfallQuery: cleanQuery,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Semantic search error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
