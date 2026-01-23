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

export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  retries = MAX_FETCH_RETRIES,
): Promise<Response> {
  let attempt = 0;
  let lastError: Error | undefined;

  while (attempt <= retries) {
    try {
      const response = await fetchWithTimeout(url, init);
      if (RETRYABLE_STATUS.has(response.status) && attempt < retries) {
        await sleep(400 * (attempt + 1));
        attempt += 1;
        continue;
      }
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt >= retries) {
        throw lastError;
      }
      await sleep(400 * (attempt + 1));
      attempt += 1;
    }
  }

  throw lastError ?? new Error('Request failed');
}
