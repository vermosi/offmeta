# supabase\functions\admin-rpc-guard-tests\index.ts

- CheckResult · type · L27-L34 — type CheckResult = { check: string; caller: 'anon' | 'authenticated_non_admin' | 'unauthenticated'; status: number; blocked: boolean; reason: string; body_excerpt: string; };
- callPostgrest · function · L36-L58 — async function callPostgrest(name: string, jwt: string): Promise<CheckResult>
- callAdminRpc · function · L60-L88 — async function callAdminRpc( fn: string, args: Record<string, unknown> | undefined, jwt: string, caller: CheckResult['caller'], expectedStatus: number, ): Promise<CheckResult>
- provisionNonAdminUser · function · L90-L116 — async function provisionNonAdminUser(): Promise<string | null>
- timingSafeEqual · function · L118-L123 — function timingSafeEqual(a: string, b: string): boolean
