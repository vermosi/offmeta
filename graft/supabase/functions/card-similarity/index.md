# supabase\functions\card-similarity\index.ts

- serve · function · L22-L25 — serve = (handler: (req: Request) => Promise<Response>)
- SimilarityRequest · interface · L27-L36 — interface SimilarityRequest
- SimilarityResponse · interface · L38-L44 — interface SimilarityResponse
- extractMechanics · function · L47-L90 — function extractMechanics(oracleText: string): string[]
- getMechanicsForCard · function · L92-L120 — async function getMechanicsForCard(card: SimilarityRequest): Promise<string[]>
- buildSimilarQuery · function · L123-L183 — function buildSimilarQuery( card: SimilarityRequest, mechanics: string[], ): string
- buildBudgetQuery · function · L186-L227 — function buildBudgetQuery( card: SimilarityRequest, mechanics: string[], ): string
