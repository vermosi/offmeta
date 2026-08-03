# supabase\functions\admin-rpc-guard-tests\index_test.ts

- CheckResult · type · L35-L41 — type CheckResult = { check: string; caller: string; status: number; blocked: boolean; reason: string; };
- GuardReport · type · L43-L49 — type GuardReport = { ok: boolean; total: number; blocked: number; failures: CheckResult[]; results: CheckResult[]; };
