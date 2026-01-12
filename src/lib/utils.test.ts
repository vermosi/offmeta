import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges classnames and tailwind variants", () => {
    const result = cn("px-2", false && "hidden", "px-4", ["text-sm", "text-sm"]);
    expect(result).toBe("px-4 text-sm");
  });
});
