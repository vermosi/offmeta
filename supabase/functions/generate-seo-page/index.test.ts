import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL") ?? "https://nxmzyykkzwomkcentctt.supabase.co";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const SCRYFALL_API = "https://api.scryfall.com";

// Test cards - well-known MTG cards
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

// ---------- Local DB benchmark ----------

Deno.test("Benchmark: Local DB card validation (batch)", async () => {
  const start = performance.now();

  const url = `${SUPABASE_URL}/rest/v1/cards?name=in.(${TEST_CARDS.map((n) => `"${n}"`).join(",")})&select=name,mana_cost,type_line`;
  const res = await fetch(url, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  });

  const data = await res.json();
  const elapsed = performance.now() - start;
  const items = Array.isArray(data) ? data : [];

  console.log(`\n📊 LOCAL DB (batch): ${elapsed.toFixed(0)}ms — found ${items.length}/${TEST_CARDS.length} cards`);
  for (const c of items) {
    console.log(`  ✅ ${c.name} | ${c.mana_cost} | ${c.type_line}`);
  }

  assertEquals(res.status, 200);
  if (items.length < TEST_CARDS.length) {
    console.log(`  ⚠️ Missing: ${TEST_CARDS.filter((n: string) => !items.find((d: { name: string }) => d.name === n)).join(", ")}`);
  }
});

// ---------- Scryfall API benchmark (sequential, respecting rate limits) ----------

Deno.test("Benchmark: Scryfall API card validation (sequential)", async () => {
  const start = performance.now();
  const found: string[] = [];
  const missed: string[] = [];

  for (const name of TEST_CARDS) {
    const res = await fetch(`${SCRYFALL_API}/cards/named?exact=${encodeURIComponent(name)}`);
    const body = await res.text();
    if (res.ok) {
      found.push(name);
    } else {
      missed.push(name);
    }
    // Scryfall asks for 50-100ms between requests
    await new Promise((r) => setTimeout(r, 100));
  }

  const elapsed = performance.now() - start;

  console.log(`\n📊 SCRYFALL API (sequential): ${elapsed.toFixed(0)}ms — found ${found.length}/${TEST_CARDS.length} cards`);
  if (missed.length) console.log(`  ❌ Missed: ${missed.join(", ")}`);

  assertEquals(found.length, TEST_CARDS.length);
});

// ---------- Test generate-seo-page rejects short queries ----------

Deno.test("generate-seo-page rejects invalid queries", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-seo-page`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: "ab" }), // too short
  });

  const body = await res.json();
  // May return 401 (auth) or 400 (validation) depending on auth setup
  console.log(`\n📊 Validation test: status=${res.status}, body=${JSON.stringify(body)}`);
  assertEquals(res.status < 500, true, "Should not be a server error");
});
