/**
 * Session-scoped de-duplication for impression telemetry.
 *
 * Impression events were firing on every mount/remount, which drowned real
 * signal (11k example-query impressions vs ~1.9k sessions). `markOnce` returns
 * true only the first time a key is seen in this session, combining an
 * in-memory guard (survives sessionStorage being unavailable in in-app
 * browsers) with sessionStorage (survives component remounts and soft reloads).
 */

const seenInMemory = new Set<string>();
const STORAGE_PREFIX = 'offmeta_once:';

export function markOnce(key: string): boolean {
  if (seenInMemory.has(key)) return false;
  seenInMemory.add(key);

  try {
    const storageKey = `${STORAGE_PREFIX}${key}`;
    if (sessionStorage.getItem(storageKey) === '1') return false;
    sessionStorage.setItem(storageKey, '1');
  } catch {
    // Storage unavailable (private mode / in-app browser): the in-memory guard
    // is enough to stop repeat sends within this page session.
  }

  return true;
}

/** Test helper: clear the in-memory guard. */
export function resetOncePerSession(): void {
  seenInMemory.clear();
}
