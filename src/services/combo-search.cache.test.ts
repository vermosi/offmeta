import { describe, expect, it } from "vitest";

import { comboSearchCacheKey } from "./combo-search";

describe("comboSearchCacheKey", () => {
  it("is insensitive to key order", () => {
    expect(comboSearchCacheKey({ a: 1, b: 2 })).toBe(comboSearchCacheKey({ b: 2, a: 1 }));
  });

  it("normalises card casing, whitespace and order", () => {
    expect(comboSearchCacheKey({ cards: ["Thassa's Oracle", " Demonic Consultation "] })).toBe(
      comboSearchCacheKey({ cards: ["demonic consultation", "thassa's oracle"] }),
    );
  });

  it("drops undefined values and empty entries", () => {
    expect(comboSearchCacheKey({ cards: ["Sol Ring", ""], limit: undefined })).toBe(
      comboSearchCacheKey({ cards: ["sol ring"] }),
    );
  });

  it("keeps distinct parameters distinct", () => {
    expect(comboSearchCacheKey({ cards: ["Sol Ring"] })).not.toBe(
      comboSearchCacheKey({ cards: ["Sol Ring"], commander: true }),
    );
  });
});
