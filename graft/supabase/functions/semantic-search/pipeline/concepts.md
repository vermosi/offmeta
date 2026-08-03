# supabase\functions\semantic-search\pipeline\concepts.ts

- findConceptMatches · function · L15-L134 — async function findConceptMatches( residualQuery: string, maxMatches: number = 5, minConfidence: number = 0.7, skipLLM: boolean = false, ): Promise<ConceptMatch[]>
- deduplicateConceptsByCategory · function · L141-L158 — function deduplicateConceptsByCategory( matches: ConceptMatch[], ): ConceptMatch[]
- classifyConceptsWithLLM · function · L165-L275 — async function classifyConceptsWithLLM( query: string, ): Promise<ConceptMatch[]>
- selectBestTemplate · function · L280-L285 — function selectBestTemplate( concept: ConceptMatch, _slots: { types: { include: string[] } }, ): string
