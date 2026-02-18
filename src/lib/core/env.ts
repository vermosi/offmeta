export type AppEnv = {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_PUBLISHABLE_KEY: string;
};

export function validateEnv(
  rawEnv: Record<string, unknown> = import.meta.env,
): AppEnv {
  const missing: string[] = [];

  const url = rawEnv['VITE_SUPABASE_URL'];
  const key = rawEnv['VITE_SUPABASE_PUBLISHABLE_KEY'];

  if (typeof url !== 'string' || !url) missing.push('VITE_SUPABASE_URL');
  if (typeof key !== 'string' || !key) missing.push('VITE_SUPABASE_PUBLISHABLE_KEY');

  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. Check your .env file or hosting configuration.`,
    );
  }

  return {
    VITE_SUPABASE_URL: url as string,
    VITE_SUPABASE_PUBLISHABLE_KEY: key as string,
  };
}

export const env = validateEnv();
