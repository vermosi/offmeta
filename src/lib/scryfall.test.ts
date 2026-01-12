import { afterEach, describe, expect, it, vi } from "vitest";

import { autocomplete, searchCards } from "./scryfall";

const mockFetch = (response: Response) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
};

describe("scryfall client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns empty results for 404 search", async () => {
    mockFetch(new Response("Not found", { status: 404, statusText: "Not Found" }));

    const result = await searchCards("t:dragon", 1);

    expect(result.total_cards).toBe(0);
    expect(result.data).toHaveLength(0);
  });

  it("throws for non-404 errors", async () => {
    mockFetch(new Response("Server error", { status: 500, statusText: "Error" }));

    await expect(searchCards("t:dragon", 1)).rejects.toThrow("Search failed");
  });

  it("returns autocomplete suggestions", async () => {
    mockFetch(new Response(JSON.stringify({ data: ["Sol Ring"] }), { status: 200 }));

    const result = await autocomplete("Sol");

    expect(result).toEqual(["Sol Ring"]);
  });
});
