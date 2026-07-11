export type AppEnv = {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_PUBLISHABLE_KEY: string;
};

const FALLBACK_SUPABASE_URL = 'https://nxmzyykkzwomkcentctt.supabase.co';
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bXp5eWtrendvbWtjZW50Y3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMzgwOTYsImV4cCI6MjA4MDgxNDA5Nn0.sJbaqJuvKqIMYV0D2Q4iWgTRlzVGih7OXRRkGmDsGPY';

export function validateEnv(
  rawEnv: Record<string, unknown> = import.meta.env,
): AppEnv {
  const url =
    typeof rawEnv['VITE_SUPABASE_URL'] === 'string' &&
    rawEnv['VITE_SUPABASE_URL']
      ? (rawEnv['VITE_SUPABASE_URL'] as string)
      : FALLBACK_SUPABASE_URL;
  const key =
    typeof rawEnv['VITE_SUPABASE_PUBLISHABLE_KEY'] === 'string' &&
    rawEnv['VITE_SUPABASE_PUBLISHABLE_KEY']
      ? (rawEnv['VITE_SUPABASE_PUBLISHABLE_KEY'] as string)
      : FALLBACK_SUPABASE_PUBLISHABLE_KEY;

  return {
    VITE_SUPABASE_URL: url,
    VITE_SUPABASE_PUBLISHABLE_KEY: key,
  };
}

export const env = validateEnv();
