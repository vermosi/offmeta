# supabase\functions\semantic-search\logging.ts

- LogEntry · interface · L3-L17 — interface LogEntry
- PreTranslationTelemetry · interface · L19-L22 — interface PreTranslationTelemetry
- flushLogQueue · function · L31-L47 — async function flushLogQueue(): Promise<void>
- shouldSkipLog · function · L59-L61 — function shouldSkipLog(query: string): boolean
- logTranslation · function · L67-L104 — function logTranslation( naturalQuery: string, translatedQuery: string, confidenceScore: number, responseTimeMs: number, validationIssues: string[], qualityFlags: string[], filters: Record<string, unknown> | null, fallbackUsed: boolean, source: string = 'ai', resultCount: number | null = null, preTranslationTelemetry?: PreTranslationTelemetry, ): void
- createLogger · function · L107-L118 — createLogger = (requestId: string)
