# src\lib\scryfall\fetch-utils.ts

- delay · function · L16-L16 — delay = (ms: number)
- fetchWithTimeout · function · L21-L38 — async function fetchWithTimeout( url: string, timeoutMs: number = FETCH_TIMEOUT_MS, init?: RequestInit, ): Promise<Response>
- fetchWithRetry · function · L43-L75 — async function fetchWithRetry( url: string, init?: RequestInit, retries = MAX_RETRIES, ): Promise<Response>
- rateLimitedFetch · function · L81-L106 — async function rateLimitedFetch(url: string): Promise<Response>
