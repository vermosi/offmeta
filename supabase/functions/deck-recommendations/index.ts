import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Parse a text decklist into card names + optional commander. */
function parseDecklist(raw: string): { cards: string[]; commander: string | null } {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  let commander: string | null = null;
  const cards: string[] = [];

  for (const line of lines) {
    // Skip section headers
    if (/^\/\//.test(line) || /^(Sideboard|Maybeboard|Companion)/i.test(line)) continue;

    // Commander markers
    const cmdrMatch = line.match(/^COMMANDER:\s*(.+)/i);
    if (cmdrMatch) {
      commander = cleanCardName(cmdrMatch[1]);
      continue;
    }

    // Standard line: optional quantity, card name, optional set info
    const m = line.match(/^(?:(\d+)x?\s+)?(.+?)(?:\s+\([\w]+\)\s+\d+.*)?$/i);
    if (!m) continue;

    let name = m[2].trim();
    // Strip *CMDR* / *F* / *E* / *P* markers
    const isCmdr = /\*CMDR\*/i.test(name);
    name = cleanCardName(name);
    if (!name) continue;

    if (isCmdr) commander = name;
    cards.push(name);
  }

  return { cards, commander };
}

function cleanCardName(n: string): string {
  return n.replace(/\*[A-Z]+\*/gi, "").replace(/\s+/g, " ").trim();
}

/** Resolve card names to Scryfall card objects using /cards/collection. */
async function resolveCards(names: string[]): Promise<Record<string, any>> {
  const result: Record<string, any> = {};
  // Batch in groups of 75
  for (let i = 0; i < names.length; i += 75) {
    const batch = names.slice(i, i + 75);
    const identifiers = batch.map((name) => ({ name }));
    try {
      const resp = await fetch("https://api.scryfall.com/cards/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifiers }),
      });
      if (resp.ok) {
        const data = await resp.json();
        for (const card of data.data ?? []) {
          // Return the full Scryfall card object so the frontend gets the same shape as search results
          result[card.name.toLowerCase()] = card;
        }
      }
      // Small delay to be respectful to Scryfall
      if (i + 75 < names.length) await new Promise((r) => setTimeout(r, 100));
    } catch (e) {
      console.error("Scryfall batch error:", e);
    }
  }
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { decklist, commander: overrideCommander, colorIdentity: deckColorIdentity } = await req.json();
    if (!decklist || typeof decklist !== "string" || decklist.length > 10000) {
      return new Response(JSON.stringify({ error: "Invalid or too-long decklist" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = parseDecklist(decklist);
    const commander = overrideCommander || parsed.commander;
    const cardNames = parsed.cards;

    if (cardNames.length === 0) {
      return new Response(JSON.stringify({ error: "No cards found in decklist" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build prompt
    const commanderLine = commander ? `Commander: ${commander}` : "Commander: Unknown (infer from decklist)";
    const cardList = cardNames.join("\n");

    const ciColors = Array.isArray(deckColorIdentity) && deckColorIdentity.length > 0
      ? deckColorIdentity
      : null;
    const ciConstraint = ciColors
      ? `\n\nCRITICAL COLOR IDENTITY RULE: The commander's color identity is [${ciColors.join(", ")}]. You MUST ONLY recommend cards whose color identity is a subset of [${ciColors.join(", ")}]. Do NOT recommend any card that has colors outside this identity. For example, if the identity is [W, U, B], do NOT recommend cards with R or G in their color identity.`
      : "";

    const systemPrompt = `You are an expert Magic: The Gathering EDH/Commander deckbuilding advisor. Given a decklist and commander, suggest 15-20 card recommendations organized into exactly 3 categories:

1. "High Synergy" – Cards that strongly synergize with the commander's strategy or key themes in the deck.
2. "Upgrades" – Strictly better or more efficient replacements for weaker cards in the list.
3. "Budget Picks" – Powerful cards under $5 that would improve the deck.

For each recommended card, provide the exact English card name (as printed) and a one-sentence reason. Do NOT recommend cards already in the decklist.${ciConstraint}

You MUST respond using the suggest_cards tool.`;

    const userPrompt = `${commanderLine}

Decklist (${cardNames.length} cards):
${cardList}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_cards",
              description: "Return categorized card recommendations for an EDH deck.",
              parameters: {
                type: "object",
                properties: {
                  categories: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", enum: ["High Synergy", "Upgrades", "Budget Picks"] },
                        cards: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string" },
                              reason: { type: "string" },
                            },
                            required: ["name", "reason"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["name", "cards"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["categories"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_cards" } },
      }),
    });

    if (!aiResp.ok) {
      const status = aiResp.status;
      const body = await aiResp.text();
      console.error("AI gateway error:", status, body);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "AI returned unexpected format" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recommendations = JSON.parse(toolCall.function.arguments);

    // Collect all recommended card names for Scryfall resolution
    const allRecNames: string[] = [];
    for (const cat of recommendations.categories) {
      for (const c of cat.cards) {
        allRecNames.push(c.name);
      }
    }

    const resolved = await resolveCards(allRecNames);

    // Post-filter: remove cards that violate color identity (safety net)
    const isColorLegal = (card: any): boolean => {
      if (!ciColors || !card?.color_identity) return true;
      return card.color_identity.every((c: string) => ciColors.includes(c));
    };

    // Merge Scryfall data into recommendations, filtering out color identity violations
    const enriched = recommendations.categories.map((cat: any) => ({
      name: cat.name,
      cards: cat.cards
        .map((c: any) => ({
          ...c,
          scryfall: resolved[c.name.toLowerCase()] ?? null,
        }))
        .filter((c: any) => isColorLegal(c.scryfall)),
    }));

    return new Response(
      JSON.stringify({
        commander,
        deckSize: cardNames.length,
        categories: enriched,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("deck-recommendations error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
