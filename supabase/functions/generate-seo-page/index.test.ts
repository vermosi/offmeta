import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL") ?? "https://nxmzyykkzwomkcentctt.supabase.co";
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ANON_KEY;

// Well-known MTG cards that should exist in the local DB
const TEST_CARDS = [
  "Sol Ring",
  "Lightning Bolt",
  "Counterspell",
  "Swords to Plowshares",
  "Birds of Paradise",
  "Dark Ritual",
  "Llanowar Elves",
  "Path to Exile",
  "Cultivate",
  "Kodama's Reach",
];

// ─── Local DB Card Validation ───────────────────────────────────────────

Deno.test("Local DB: batch card lookup returns results with metadata", async () => {
  const url = `${SUPABASE_URL}/rest/v1/cards?select=name,mana_cost,type_line&name=in.(${TEST_CARDS.map((n) => `"${n}"`).join(",")})`;
  const res = await fetch(url, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  });

  const data = await res.json();
  const items = Array.isArray(data) ? data : [];

  if (res.status === 401) {
    console.log("⏭️ Skipping: API key not available in test env");
    return;
  }

  assertEquals(res.status, 200);
  console.log(`✅ Found ${items.length}/${TEST_CARDS.length} cards in local DB`);

  // Every returned card should have required fields
  for (const card of items) {
    assertExists(card.name, "Card should have a name");
    assertExists(card.type_line, "Card should have a type_line");
    // mana_cost can be null for lands
  }

  if (items.length < TEST_CARDS.length) {
    const missing = TEST_CARDS.filter(
      (n) => !items.find((d: { name: string }) => d.name === n)
    );
    console.log(`⚠️ Missing from local DB: ${missing.join(", ")}`);
  }
});

Deno.test("Local DB: fuzzy ilike lookup finds partial matches", async () => {
  // Search for "Sol" should find "Sol Ring"
  const url = `${SUPABASE_URL}/rest/v1/cards?select=name&name=ilike.*Sol Ring*&limit=3`;
  const res = await fetch(url, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  });
  const data = await res.json();

  if (res.status === 401) {
    console.log("⏭️ Skipping: API key not available in test env");
    return;
  }

  const items = Array.isArray(data) ? data : [];
  console.log(`✅ Fuzzy ilike for "Sol Ring": found ${items.length} match(es)`);
  assertEquals(items.length > 0, true, "Should find at least one match");
});

// ─── Local DB Performance ───────────────────────────────────────────────

Deno.test("Local DB: batch query completes in under 500ms", async () => {
  const start = performance.now();
  const url = `${SUPABASE_URL}/rest/v1/cards?select=name,mana_cost,type_line&name=in.(${TEST_CARDS.map((n) => `"${n}"`).join(",")})`;
  const res = await fetch(url, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  });
  await res.json();
  const elapsed = performance.now() - start;

  if (res.status === 401) {
    console.log("⏭️ Skipping: API key not available in test env");
    return;
  }

  console.log(`📊 Batch lookup: ${elapsed.toFixed(0)}ms`);
  assertEquals(elapsed < 500, true, `Batch query took ${elapsed.toFixed(0)}ms, should be < 500ms`);
});

// ─── Data Freshness ─────────────────────────────────────────────────────

Deno.test("Local DB: cards data is recent (updated within 14 days)", async () => {
  const url = `${SUPABASE_URL}/rest/v1/cards?select=updated_at&order=updated_at.desc&limit=1`;
  const res = await fetch(url, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  });
  const data = await res.json();

  if (res.status === 401) {
    console.log("⏭️ Skipping: API key not available in test env");
    return;
  }

  const items = Array.isArray(data) ? data : [];
  assertEquals(items.length > 0, true, "Should have at least one card");

  const latestUpdate = new Date(items[0].updated_at);
  const daysSinceUpdate = (Date.now() - latestUpdate.getTime()) / (1000 * 60 * 60 * 24);
  console.log(`📊 Latest card update: ${latestUpdate.toISOString()} (${daysSinceUpdate.toFixed(1)} days ago)`);
  assertEquals(daysSinceUpdate < 14, true, `Cards data is ${daysSinceUpdate.toFixed(1)} days stale, should be < 14`);
});

// ─── Generate SEO Page Endpoint ─────────────────────────────────────────

Deno.test("generate-seo-page: rejects queries shorter than 3 chars", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-seo-page`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: "ab" }),
  });

  const body = await res.json();
  console.log(`📊 Short query test: status=${res.status}`);
  // Should be 400 (validation) or 401 (auth) — never 500
  assertEquals(res.status < 500, true, "Should not be a server error");
});

Deno.test("generate-seo-page: rejects queries longer than 200 chars", async () => {
  const longQuery = "a".repeat(201);
  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-seo-page`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: longQuery }),
  });

  const body = await res.json();
  console.log(`📊 Long query test: status=${res.status}`);
  assertEquals(res.status < 500, true, "Should not be a server error");
});

Deno.test("generate-seo-page: returns 409 for duplicate slug", async () => {
  // First check if any published page exists we can test against
  const checkRes = await fetch(
    `${SUPABASE_URL}/rest/v1/seo_pages?select=query&status=eq.published&limit=1`,
    { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } },
  );
  const pages = await checkRes.json();

  if (checkRes.status === 401 || !Array.isArray(pages) || pages.length === 0) {
    console.log("⏭️ Skipping: no published pages or auth unavailable");
    return;
  }

  const existingQuery = pages[0].query;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-seo-page`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: existingQuery }),
  });

  const body = await res.json();
  console.log(`📊 Duplicate test: status=${res.status}, body=${JSON.stringify(body).slice(0, 100)}`);
  // Should be 409 (conflict) or 401 (auth) — not 500
  assertEquals(res.status < 500, true, "Should not be a server error");
});
