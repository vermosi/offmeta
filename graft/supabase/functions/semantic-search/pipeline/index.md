# supabase\functions\semantic-search\pipeline\index.ts

- runPipeline · function · L40-L300 — async function runPipeline( query: string, context: PipelineContext, ): Promise<PipelineResult>
- ValidationResultWrapper · interface · L302-L307 — interface ValidationResultWrapper
- buildResult · function · L312-L362 — function buildResult(params: { originalQuery: string; normalizedQuery: string; intent?: ReturnType<typeof classifyIntent>; slots: ExtractedSlots; concepts: ConceptMatch[]; assembled?: ReturnType<typeof assembleQuery>; finalQuery: string; validation?: ValidationResultWrapper['validation']; repairs?: ValidationResultWrapper['repairs']; broadening?: ValidationResultWrapper['broadening']; source: PipelineResult['source']; explanation: PipelineResult['explanation']; startTime: number; debug: boolean; }): PipelineResult
- emptySlots · function · L367-L385 — function emptySlots(): ExtractedSlots
- calculateConfidence · function · L397-L412 — function calculateConfidence( hasDeterministic: boolean, conceptCount: number, isValid: boolean, repairSucceeded: boolean, ): number
- buildReadableExplanation · function · L417-L461 — function buildReadableExplanation( originalQuery: string, slots: ExtractedSlots, concepts: ConceptMatch[], ): string
