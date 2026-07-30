// Isolated static import so the Supabase edge-runtime whitelists the module
// at deploy-time build. auth.ts imports this lazily via a relative dynamic
// import so Vitest never has to resolve the https URL.
// @ts-expect-error -- resolved by Deno at deploy time
export { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
