# supabase\functions\semantic-search\pipeline\assemble.ts

- assembleQuery · function · L34-L223 — function assembleQuery( slots: ExtractedSlots, concepts: ConceptMatch[], options: { maxQueryLength?: number; } = {}, ): AssembledQuery
- buildColorQuery · function · L225-L257 — function buildColorQuery( colors: NonNullable<ExtractedSlots['colors']>, ): string
- stripColorConstraints · function · L264-L269 — function stripColorConstraints(template: string): string
- removeDuplicateParts · function · L271-L285 — function removeDuplicateParts(query: string): string
- normalizeParentheses · function · L287-L315 — function normalizeParentheses(query: string): string
- applyExternalFilters · function · L320-L348 — function applyExternalFilters( query: string, filters?: { format?: string; colorIdentity?: string[]; maxCmc?: number; }, ): string
