# supabase\functions\_shared\aiClient.ts

- isValidModel · function · L35-L37 — function isValidModel(model: string): boolean
- AIMessage · interface · L39-L42 — interface AIMessage
- AIToolDefinition · interface · L44-L51 — interface AIToolDefinition
- AIToolCallRequest · interface · L53-L59 — interface AIToolCallRequest
- AIUsage · interface · L61-L65 — interface AIUsage
- AIToolCallResult · interface · L67-L72 — interface AIToolCallResult<T>
- AIGatewayError · class · L74-L82 — class AIGatewayError extends Error
- constructor · method · L75-L81 — constructor( message: string, public readonly status: number, )
- isTransient · function · L85-L87 — function isTransient(status: number): boolean
- fetchWithTimeout · function · L90-L107 — async function fetchWithTimeout( url: string, init: RequestInit, timeoutMs: number, ): Promise<Response>
- callAIWithTools · function · L116-L122 — async function callAIWithTools<T = Record<string, unknown>>( apiKey: string, request: AIToolCallRequest, ): Promise<T>
- callAIWithToolsTracked · function · L127-L240 — async function callAIWithToolsTracked<T = Record<string, unknown>>( apiKey: string, request: AIToolCallRequest, ): Promise<AIToolCallResult<T>>
- aiErrorResponse · function · L245-L266 — function aiErrorResponse( error: unknown, corsHeaders: Record<string, string>, fallbackMessage = 'Internal error', ): Response
- persistUsage · function · L272-L282 — function persistUsage(record: { model: string; functionName: string; promptTokens: number; completionTokens: number; totalTokens: number; durationMs: number; retries: number; }): void
