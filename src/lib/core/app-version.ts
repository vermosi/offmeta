/**
 * Build identity for the running client bundle.
 *
 * Injected at build time by Vite (`__APP_VERSION__`). Every search translation
 * is stamped with this value so search confidence can be tracked per deploy
 * instead of only in aggregate.
 */

const FALLBACK = 'dev';

function readInjectedVersion(): string {
  try {
    return typeof __APP_VERSION__ === 'string' && __APP_VERSION__.trim()
      ? __APP_VERSION__.trim()
      : FALLBACK;
  } catch {
    return FALLBACK;
  }
}

/** Sanitised, log-safe build identifier (max 64 chars). */
export const APP_VERSION: string = readInjectedVersion()
  .replace(/[^A-Za-z0-9._-]/g, '')
  .slice(0, 64) || FALLBACK;
