/* Minimal Deno type shim so the Vite/TS checker doesn't error on edge-function code.
   In actual Deno runtime these are already provided natively. */

// Allow bare https:// imports used by edge functions (esm.sh, etc.)
declare module 'https://*' {
  const mod: unknown;
  export default mod;
}

// Named export shim for the Supabase JS client imported via esm.sh
declare module 'https://esm.sh/@supabase/supabase-js@2' {
  export function createClient(url: string, key: string, options?: unknown): any;
}
