# src\hooks\useQuerySuggestions.ts

- QuerySuggestion · interface · L10-L15 — interface QuerySuggestion
- cleanupQuery · function · L21-L41 — function cleanupQuery(q: string): string
- generateSimplifiedQueries · function · L137-L164 — function generateSimplifiedQueries( query: string, maxSuggestions: number = 3, ): Array<{ query: string; label: string }>
- checkQueryResults · function · L170-L186 — async function checkQueryResults(query: string): Promise<number | null>
- scoreSuggestion · function · L188-L201 — function scoreSuggestion( originalQuery: string, suggestionQuery: string, totalCards: number, ): number
- useQuerySuggestions · function · L207-L285 — function useQuerySuggestions( query: string, totalCards: number, hasSearched: boolean, )
- run · function · L233-L275 — run = async ()
