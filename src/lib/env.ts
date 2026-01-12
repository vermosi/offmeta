import { z } from "zod";

const runtimeSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export type RuntimeEnv = z.infer<typeof runtimeSchema>;

const formatZodErrors = (error: z.ZodError) =>
  error.errors.map(issue => `- ${issue.path.join(".")}: ${issue.message}`).join("\n");

export const getRuntimeEnv = (env: Record<string, string | undefined>): RuntimeEnv => {
  const parsed = runtimeSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(
      `Missing or invalid environment variables:\n${formatZodErrors(parsed.error)}\n` +
        "Ensure the required VITE_ variables are set in your .env file."
    );
  }
  return parsed.data;
};
