import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges classnames and tailwind variants", () => {
    const shouldHide = false;
    const result = cn("px-2", shouldHide && "hidden", "px-4", ["text-sm", "text-sm"]);
    expect(result).toBe("px-4 text-sm");
  });
});
