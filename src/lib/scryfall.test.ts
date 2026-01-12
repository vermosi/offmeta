import { describe, expect, it, vi, afterEach } from "vitest";
import { autocomplete, searchCards } from "@/lib/scryfall";

const mockResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("scryfall client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("searchCards returns empty list on 404", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse({ object: "error" }, 404),
    );

    const result = await searchCards("t:dragon");

    expect(result.total_cards).toBe(0);
    expect(fetchSpy).toHaveBeenCalled();
  });

  it("autocomplete returns suggestions", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse({ object: "catalog", total_values: 2, data: ["Sol Ring", "Soul Warden"] }),
    );

    const result = await autocomplete("so");

    expect(result).toEqual(["Sol Ring", "Soul Warden"]);
  });
});
