# supabase\functions\semantic-search\validation.ts

- ValidationCase · interface · L7-L17 — interface ValidationCase
- AutoCorrectionCase · interface · L19-L24 — interface AutoCorrectionCase
- removeDuplicateParameters · function · L75-L89 — function removeDuplicateParameters(query: string): string
- sanitizeInputQuery · function · L95-L196 — function sanitizeInputQuery(query: string): { valid: boolean; reason?: string; sanitized?: string; }
- validateQuery · function · L202-L357 — function validateQuery(query: string): { valid: boolean; sanitized: string; issues: string[]; }
- normalizeOrGroups · function · L364-L433 — function normalizeOrGroups(query: string): string
- flushGroup · function · L389-L395 — flushGroup = ()
- detectQualityFlags · function · L438-L481 — function detectQualityFlags(translatedQuery: string): string[]
- applyAutoCorrections · function · L486-L592 — function applyAutoCorrections( query: string, qualityFlags: string[], ): { correctedQuery: string; corrections: string[] }
- runValidationTables · function · L594-L681 — function runValidationTables(): void
