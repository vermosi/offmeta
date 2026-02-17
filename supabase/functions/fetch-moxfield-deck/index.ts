import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Proxy edge function to fetch a Moxfield deck by public ID.
 * Avoids CORS issues from calling Moxfield API directly from the browser.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "Missing url parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract public ID from various Moxfield URL formats
    // e.g. https://www.moxfield.com/decks/xqpbIjgy5UqsUBxorCsT2w
    // or just the ID itself
    let publicId = url.trim();
    const moxfieldMatch = publicId.match(/moxfield\.com\/decks\/([A-Za-z0-9_-]+)/);
    if (moxfieldMatch) {
      publicId = moxfieldMatch[1];
    }

    // Validate ID format (base64url characters only)
    if (!/^[A-Za-z0-9_-]+$/.test(publicId) || publicId.length > 50) {
      return new Response(JSON.stringify({ error: "Invalid Moxfield deck URL or ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiUrl = `https://api2.moxfield.com/v3/decks/all/${publicId}`;
    const resp = await fetch(apiUrl, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "OffMeta/1.0 (deck-recommendations)",
      },
    });

    if (!resp.ok) {
      const status = resp.status;
      await resp.text(); // consume body
      return new Response(
        JSON.stringify({ error: status === 404 ? "Deck not found on Moxfield" : `Moxfield API error (${status})` }),
        { status: status === 404 ? 404 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const deck = await resp.json();

    // Extract commander(s)
    const commanders: string[] = [];
    if (deck.commanders) {
      for (const key of Object.keys(deck.commanders)) {
        const entry = deck.commanders[key];
        const name = entry?.card?.name;
        if (name) commanders.push(name);
      }
    }
    // Also check "main" for commander in some formats
    if (commanders.length === 0 && deck.main) {
      for (const key of Object.keys(deck.main)) {
        const entry = deck.main[key];
        if (entry?.boardType === "commanders") {
          const name = entry?.card?.name;
          if (name) commanders.push(name);
        }
      }
    }

    // Build text decklist from mainboard + commanders
    const lines: string[] = [];
    const colorIdentity = new Set<string>();

    if (commanders.length > 0) {
      lines.push(`COMMANDER: ${commanders.join(" // ")}`);
    }

    const boards = ["commanders", "mainboard", "companions"];
    for (const boardName of boards) {
      const board = deck[boardName];
      if (!board || typeof board !== "object") continue;
      for (const key of Object.keys(board)) {
        const entry = board[key];
        const name = entry?.card?.name;
        const qty = entry?.quantity ?? 1;
        if (name) lines.push(`${qty} ${name}`);
        // Collect color identity from card data
        const ci = entry?.card?.color_identity;
        if (Array.isArray(ci)) {
          for (const c of ci) colorIdentity.add(c);
        }
      }
    }

    return new Response(
      JSON.stringify({
        deckName: deck.name ?? "Unknown Deck",
        format: deck.format ?? "commander",
        commander: commanders.length > 0 ? commanders.join(" // ") : null,
        colorIdentity: ["W", "U", "B", "R", "G"].filter((c) => colorIdentity.has(c)),
        decklist: lines.join("\n"),
        cardCount: lines.filter((l) => !l.startsWith("COMMANDER:")).length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("fetch-moxfield-deck error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
