import { afterEach, beforeEach, describe, expect, it } from "bun:test";

const BASE_URL = "https://api.scryfall.com";

const makeJsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const loadScryfall = async () =>
  import(`./scryfall?test=${Math.random().toString(36).slice(2)}`);

describe("scryfall client", () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("queries /cards/search and returns results", async () => {
    const fetchMock = async (url: string) => {
      expect(url).toBe(
        `${BASE_URL}/cards/search?q=t%3Adragon&page=2`
      );
      return makeJsonResponse({
        object: "list",
        total_cards: 1,
        has_more: false,
        data: [{ id: "test" }],
      });
    };
    globalThis.fetch = fetchMock;

    const { searchCards } = await loadScryfall();
    const result = await searchCards("t:dragon", 2);

    expect(result.total_cards).toBe(1);
    expect(result.data).toHaveLength(1);
  });

  it("maps search 404s to empty results", async () => {
    globalThis.fetch = async () => makeJsonResponse({}, 404);

    const { searchCards } = await loadScryfall();
    const result = await searchCards("nonexistent-card");

    expect(result.total_cards).toBe(0);
    expect(result.data).toEqual([]);
  });

  it("requests /cards/autocomplete and returns names", async () => {
    let calls = 0;
    globalThis.fetch = async (url: string) => {
      calls += 1;
      expect(url).toBe(`${BASE_URL}/cards/autocomplete?q=bl`);
      return makeJsonResponse({ data: ["Black Lotus"] });
    };

    const { autocomplete } = await loadScryfall();
    const result = await autocomplete("bl");

    expect(result).toEqual(["Black Lotus"]);
    expect(calls).toBe(1);
  });

  it("returns empty autocomplete results for short or error queries", async () => {
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return makeJsonResponse({}, 500);
    };

    const { autocomplete } = await loadScryfall();
    expect(await autocomplete("b")).toEqual([]);
    expect(await autocomplete("bl")).toEqual([]);
    expect(calls).toBe(1);
  });

  it("requests /cards/random", async () => {
    globalThis.fetch = async (url: string) => {
      expect(url).toBe(`${BASE_URL}/cards/random`);
      return makeJsonResponse({ id: "random" });
    };

    const { getRandomCard } = await loadScryfall();
    const result = await getRandomCard();

    expect(result.id).toBe("random");
  });

  it("requests /cards/named with exact lookup", async () => {
    globalThis.fetch = async (url: string) => {
      expect(url).toBe(`${BASE_URL}/cards/named?exact=Black%20Lotus`);
      return makeJsonResponse({ id: "black-lotus" });
    };

    const { getCardByName } = await loadScryfall();
    const result = await getCardByName("Black Lotus");

    expect(result.id).toBe("black-lotus");
  });

  it("throws on named card lookup failures", async () => {
    globalThis.fetch = async () => makeJsonResponse({}, 404);

    const { getCardByName } = await loadScryfall();

    await expect(getCardByName("Unknown Card")).rejects.toThrow(
      "Card not found"
    );
  });

  it("requests /cards/{id}/rulings and returns data", async () => {
    globalThis.fetch = async (url: string) => {
      expect(url).toBe(`${BASE_URL}/cards/abc123/rulings`);
      return makeJsonResponse({
        data: [
          {
            object: "ruling",
            oracle_id: "oracle",
            source: "scryfall",
            published_at: "2020-01-01",
            comment: "Example ruling",
          },
        ],
      });
    };

    const { getCardRulings } = await loadScryfall();
    const result = await getCardRulings("abc123");

    expect(result).toHaveLength(1);
    expect(result[0]?.comment).toBe("Example ruling");
  });

  it("rate-limits queued requests under rapid calls", async () => {
    const callTimes: number[] = [];
    globalThis.fetch = async () => {
      callTimes.push(Date.now());
      return makeJsonResponse({ object: "list", total_cards: 0, has_more: false, data: [] });
    };

    const { searchCards } = await loadScryfall();

    const start = Date.now();
    await Promise.all([
      searchCards("a"),
      searchCards("b"),
      searchCards("c"),
    ]);

    expect(callTimes).toHaveLength(3);
    expect(callTimes[1] - callTimes[0]).toBeGreaterThanOrEqual(95);
    expect(callTimes[2] - callTimes[1]).toBeGreaterThanOrEqual(95);
    expect(callTimes[2] - start).toBeGreaterThanOrEqual(190);
  });
});
