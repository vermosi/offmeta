# supabase\functions\_shared\logger.ts

- LogLevel · type · L11-L11 — type LogLevel = 'info' | 'warn' | 'error' | 'debug';
- StructuredLogData · interface · L13-L15 — interface StructuredLogData
- emit · function · L32-L44 — function emit(level: LogLevel, payload: Record<string, unknown>): void
- safeStringify · function · L46-L62 — function safeStringify(value: unknown): string
- logEvent · function · L64-L76 — function logEvent( level: LogLevel, event: string, metadata: StructuredLogData = {}, ): void
- formatError · function · L82-L111 — function formatError(err: unknown): StructuredLogData
- coerceMetadata · function · L113-L121 — function coerceMetadata( metadata: StructuredLogData | unknown, ): StructuredLogData
- ScopedLogger · interface · L123-L135 — interface ScopedLogger
- makeLogger · function · L137-L158 — function makeLogger(bindings: StructuredLogData): ScopedLogger
- emitWith · function · L138-L142 — emitWith = ( level: LogLevel, event: string, metadata: StructuredLogData | unknown = {}, )
- createLogger · function · L160-L165 — function createLogger( scope: string, bindings: StructuredLogData = {}, ): ScopedLogger
- newRequestId · function · L168-L177 — function newRequestId(req?: Request): string
- RequestContext · interface · L179-L183 — interface RequestContext
- LoggingHandler · type · L185-L188 — type LoggingHandler = ( req: Request, ctx: RequestContext, ) => Promise<Response> | Response;
- WithLoggingOptions · interface · L190-L195 — interface WithLoggingOptions
- withLogging · function · L203-L265 — function withLogging( scope: string, handler: LoggingHandler, options: WithLoggingOptions = {}, ): (req: Request) => Promise<Response>
