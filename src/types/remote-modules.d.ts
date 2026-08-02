/**
 * Type shims for remote (Deno/esm.sh) module specifiers used by edge-function
 * code that is imported into src-level unit tests.
 */
declare module 'https://esm.sh/@supabase/supabase-js@2' {
  export function createClient(
    url: string,
    key: string,
    options?: unknown,
  ): unknown;
}
