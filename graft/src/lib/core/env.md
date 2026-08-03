# src\lib\core\env.ts

- AppEnv · type · L1-L4 — type AppEnv = { VITE_SUPABASE_URL: string; VITE_SUPABASE_PUBLISHABLE_KEY: string; };
- validateEnv · function · L10-L28 — function validateEnv( rawEnv: Record<string, unknown> = import.meta.env ?? {}, ): AppEnv
