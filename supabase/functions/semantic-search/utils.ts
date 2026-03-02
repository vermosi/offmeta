export const FETCH_TIMEOUT_MS = 15000;
export const MAX_FETCH_RETRIES = 2;
export const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

interface FetchWithRetryOptions {
  retries?: number;
  timeoutMs?: number;
  deadlineMs?: number;
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  options: FetchWithRetryOptions = {},
): Promise<Response> {
  const retries = options.retries ?? MAX_FETCH_RETRIES;
  const timeoutMs = options.timeoutMs ?? FETCH_TIMEOUT_MS;
  const deadlineMs = options.deadlineMs;

  let attempt = 0;
  let lastError: Error | undefined;

  while (attempt <= retries) {
    const now = Date.now();
    if (deadlineMs !== undefined && now >= deadlineMs) {
      throw new Error('Request budget exceeded');
    }

    const remainingBudget =
      deadlineMs !== undefined ? Math.max(deadlineMs - now, 1) : undefined;
    const requestTimeoutMs =
      remainingBudget !== undefined
        ? Math.min(timeoutMs, remainingBudget)
        : timeoutMs;

    try {
      const response = await fetchWithTimeout(url, init, requestTimeoutMs);
      if (RETRYABLE_STATUS.has(response.status) && attempt < retries) {
        const backoffMs = 400 * (attempt + 1);
        if (deadlineMs !== undefined && Date.now() + backoffMs >= deadlineMs) {
          return response;
        }
        await sleep(backoffMs);
        attempt += 1;
        continue;
      }
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt >= retries) {
        throw lastError;
      }

      const backoffMs = 400 * (attempt + 1);
      if (deadlineMs !== undefined && Date.now() + backoffMs >= deadlineMs) {
        throw lastError;
      }

      await sleep(backoffMs);
      attempt += 1;
    }
  }

  throw lastError ?? new Error('Request failed');
}
