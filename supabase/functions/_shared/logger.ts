export type LogLevel = 'info' | 'warn' | 'error';

export interface StructuredLogData {
  [key: string]: unknown;
}

export function logEvent(
  level: LogLevel,
  event: string,
  metadata: StructuredLogData = {},
): void {
  const payload = JSON.stringify({
    level,
    event,
    timestamp: new Date().toISOString(),
    ...metadata,
  });

  if (level === 'warn') {
    console.warn(payload);
    return;
  }

  if (level === 'error') {
    console.error(payload);
    return;
  }

  console.log(payload);
}

function coerceMetadata(metadata: StructuredLogData | unknown): StructuredLogData {
  if (!metadata || typeof metadata !== 'object') {
    return metadata !== undefined ? { detail: String(metadata) } : {};
  }
  if ('message' in (metadata as Record<string, unknown>)) {
    const err = metadata as Record<string, unknown>;
    return { message: String(err.message), ...(err.code ? { code: String(err.code) } : {}) };
  }
  return metadata as StructuredLogData;
}

export function createLogger(scope: string) {
  return {
    info: (event: string, metadata: StructuredLogData = {}) =>
      logEvent('info', event, { scope, ...metadata }),
    warn: (event: string, metadata: StructuredLogData = {}) =>
      logEvent('warn', event, { scope, ...metadata }),
    error: (event: string, metadata?: StructuredLogData | unknown) =>
      logEvent('error', event, { scope, ...coerceMetadata(metadata) }),
  };
}
