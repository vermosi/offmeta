import { describe, expect, it } from "vitest";

import { getRuntimeEnv } from "./env";

describe("getRuntimeEnv", () => {
  it("validates required environment variables", () => {
    const env = getRuntimeEnv({
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "anon-key",
    });

    expect(env.VITE_SUPABASE_URL).toBe("https://example.supabase.co");
  });

  it("throws a helpful error when required variables are missing", () => {
    expect(() =>
      getRuntimeEnv({
        VITE_SUPABASE_URL: "",
        VITE_SUPABASE_PUBLISHABLE_KEY: undefined,
      })
    ).toThrow(/Missing or invalid environment variables/);
  });
});
