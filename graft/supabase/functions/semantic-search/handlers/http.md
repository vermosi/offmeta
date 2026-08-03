# supabase\functions\semantic-search\handlers\http.ts

- RequestBudget · interface · L9-L13 — interface RequestBudget
- errorResponse · function · L15-L24 — function errorResponse( message: string, status: number, headers: Record<string, string>, ): Response
- sanitizeError · function · L26-L31 — function sanitizeError(error: unknown): string
- parseRequestBudget · function · L33-L57 — function parseRequestBudget( req: Request, requestStartTime: number, requestBudgetMs: number, ): RequestBudget
- handleCorsPreflight · function · L59-L71 — function handleCorsPreflight( req: Request, corsHeaders: Record<string, string>, ): Response | null
- enforceRequestGuards · function · L73-L150 — async function enforceRequestGuards( req: Request, jsonHeaders: Record<string, string>, logWarn: (event: string, payload: Record<string, unknown>) => void, ): Promise<Response | null>
- parseJsonBody · function · L152-L181 — async function parseJsonBody( req: Request, jsonHeaders: Record<string, string>, logWarn: (event: string, payload: Record<string, unknown>) => void, ): Promise<{ requestBody: Record<string, unknown> } | { response: Response }>
