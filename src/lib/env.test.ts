import { describe, expect, it } from "vitest";
import { validateEnv } from "@/lib/env";

describe("validateEnv", () => {
  it("returns env when required values are present", () => {
    const env = validateEnv({
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "public-key",
    });

    expect(env.VITE_SUPABASE_URL).toBe("https://example.supabase.co");
  });

  it("throws when required values are missing", () => {
    expect(() => validateEnv({})).toThrow(/Missing required environment variables/i);
  });
});
