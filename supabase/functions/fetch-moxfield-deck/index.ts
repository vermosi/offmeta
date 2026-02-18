import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth, getCorsHeaders } from "../_shared/auth.ts";
import { checkRateLimit, maybeCleanup } from "../_shared/rateLimit.ts";

/**
 * Proxy edge function to fetch a Moxfield deck by public ID.
 * Avoids CORS issues from calling Moxfield API directly from the browser.
 * Requires authentication to prevent abuse / Moxfield API exhaustion.
 */
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Require valid auth token (anon key, user JWT, or service role)
  const { authorized, error: authError } = validateAuth(req);
  if (!authorized) {
    return new Response(JSON.stringify({ error: authError || "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // IP-based rate limiting: 10 req/min per IP, 200 global
  maybeCleanup();
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { allowed, retryAfter } = await checkRateLimit(clientIp, undefined, 10, 200);
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: "Too many requests", retryAfter }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
        },
      }
    );
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
        JSON.stringify({
          error:
            status === 404
              ? "Deck not found on Moxfield"
              : `Moxfield API error (${status})`,
        }),
        {
          status: status === 404 ? 404 : 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const deck = await resp.json();

    // The v3 API nests boards inside a "boards" object
    const boards = deck.boards ?? deck;

    // Extract commander(s) from boards.commanders.cards
    const commanders: string[] = [];
    const cmdBoard = boards.commanders;
    if (cmdBoard) {
      const cmdCards = cmdBoard.cards ?? cmdBoard;
      if (cmdCards && typeof cmdCards === "object") {
        for (const key of Object.keys(cmdCards)) {
          const entry = cmdCards[key];
          const name = entry?.card?.name ?? entry?.name;
          if (name) commanders.push(name);
        }
      }
    }

    // Build text decklist
    const lines: string[] = [];

    if (commanders.length > 0) {
      lines.push(`COMMANDER: ${commanders.join(" // ")}`);
    }

    const boardNames = ["commanders", "mainboard", "companions"];
    for (const boardName of boardNames) {
      const board = boards[boardName];
      if (!board || typeof board !== "object") continue;
      const cards = board.cards ?? board;
      if (!cards || typeof cards !== "object") continue;
      for (const key of Object.keys(cards)) {
        const entry = cards[key];
        if (!entry || typeof entry !== "object") continue;
        const name = entry?.card?.name ?? entry?.name;
        const qty = entry?.quantity ?? 1;
        if (name) lines.push(`${qty} ${name}`);
      }
    }

    // Use deck-level colorIdentity directly from API
    const deckColorIdentity: string[] = Array.isArray(deck.colorIdentity)
      ? ["W", "U", "B", "R", "G"].filter((c) => deck.colorIdentity.includes(c))
      : [];

    return new Response(
      JSON.stringify({
        deckName: deck.name ?? "Unknown Deck",
        format: deck.format ?? "commander",
        commander: commanders.length > 0 ? commanders.join(" // ") : null,
        colorIdentity: deckColorIdentity,
        decklist: lines.join("\n"),
        cardCount: lines.filter((l) => !l.startsWith("COMMANDER:")).length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("fetch-moxfield-deck error:", e);
    return new Response(
      JSON.stringify({ error: "Failed to fetch deck" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
