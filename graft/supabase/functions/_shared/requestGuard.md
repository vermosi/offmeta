# supabase\functions\_shared\requestGuard.ts

- GuardOptions · interface · L14-L23 — interface GuardOptions
- GuardContext · interface · L25-L29 — interface GuardContext
- GuardResult · type · L31-L33 — type GuardResult = | { ok: true; ctx: GuardContext } | { ok: false; response: Response };
- runRequestGuard · function · L39-L122 — async function runRequestGuard( req: Request, options: GuardOptions = {}, ): Promise<GuardResult>
