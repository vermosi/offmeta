# supabase\functions\semantic-search\pipeline\repair.ts

- sanitizeQuerySyntax · function · L16-L79 — function sanitizeQuerySyntax(query: string): string
- validateWithScryfall · function · L84-L128 — async function validateWithScryfall( query: string, overlyBroadThreshold: number = 1500, ): Promise<ValidationResult>
- repairQuery · function · L217-L279 — async function repairQuery( query: string, originalError?: string, overlyBroadThreshold: number = 1500, ): Promise<RepairResult>
- broadenQuery · function · L340-L399 — async function broadenQuery( query: string, overlyBroadThreshold: number = 1500, ): Promise<BroadenResult>
- validateAndFixQuery · function · L404-L451 — async function validateAndFixQuery( query: string, options: { enableRepair?: boolean; enableBroadening?: boolean; overlyBroadThreshold?: number; } = {}, ): Promise<{ finalQuery: string; validation: ValidationResult | null; repairs: RepairResult | null; broadening: BroadenResult | null; }>
