// Test-only function folder. No runtime handler needed; the Deno test runner
// picks up index.test.ts to verify admin RPC authorization guards.
Deno.serve(() => new Response("test-only", { status: 200 }));
