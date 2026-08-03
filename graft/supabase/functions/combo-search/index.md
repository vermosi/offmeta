# supabase\functions\combo-search\index.ts

- fetchWithTimeout · function · L22-L34 — async function fetchWithTimeout( url: string, init: RequestInit = {}, timeoutMs = FETCH_TIMEOUT_MS, ): Promise<Response>
- ComboCard · interface · L36-L40 — interface ComboCard
- ComboResult · interface · L42-L56 — interface ComboResult
- parseVariant · function · L58-L105 — function parseVariant(variant: Record<string, unknown>): ComboResult
- json · function · L107-L116 — function json( data: unknown, status = 200, extraHeaders: Record<string, string> = {}, )
