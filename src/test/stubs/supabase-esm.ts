/**
 * Test-only stub for the `https://esm.sh/@supabase/supabase-js@2` import used
 * by edge-function shared modules. Vitest's ESM loader cannot resolve remote
 * URLs, so vite.config.ts aliases that specifier to this file during tests.
 * @module test/stubs/supabase-esm
 */

type StubClient = Record<string, unknown>;

export function createClient(): StubClient {
  const notImplemented = () => {
    throw new Error('supabase client stub: not implemented in tests');
  };
  return {
    from: notImplemented,
    rpc: notImplemented,
    functions: { invoke: notImplemented },
    auth: { getUser: notImplemented },
  };
}

export default { createClient };
