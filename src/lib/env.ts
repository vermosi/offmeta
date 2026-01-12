import { z } from "zod";

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(rawEnv: Record<string, unknown> = import.meta.env): AppEnv {
  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    const missingKeys = result.error.issues
      .map((issue) => issue.path.join("."))
      .filter(Boolean);
    const message = missingKeys.length
      ? `Missing required environment variables: ${missingKeys.join(", ")}`
      : "Invalid environment configuration";

    throw new Error(`${message}. Check your .env file or hosting configuration.`);
  }

  return result.data;
}

export const env = validateEnv();
