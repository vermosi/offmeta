# supabase\functions\semantic-search\contract.test.ts

- SuccessResponse · interface · L30-L41 — interface SuccessResponse
- ErrorResponse · interface · L43-L46 — interface ErrorResponse
- postSearch · function · L50-L56 — async function postSearch(body: Record<string, unknown>): Promise<Response>
- assertSuccessShape · function · L58-L77 — function assertSuccessShape(data: SuccessResponse)
- assertErrorShape · function · L79-L83 — function assertErrorShape(data: ErrorResponse)
- assertQueryContains · function · L86-L94 — function assertQueryContains(query: string, fragments: string[], label: string)
