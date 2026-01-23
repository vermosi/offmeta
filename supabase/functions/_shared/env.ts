/**
 * Validation utility for environment variables in Edge Functions.
 */

export function validateEnv(requiredKeys: string[]): Record<string, string> {
  const env: Record<string, string> = {};
  const missing: string[] = [];

  for (const key of requiredKeys) {
    const value = Deno.env.get(key);
    if (!value) {
      missing.push(key);
    } else {
      env[key] = value;
    }
  }

  if (missing.length > 0) {
    console.error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
    throw new Error(`Configuration Error: Missing ${missing.join(', ')}`);
  }

  return env;
}
