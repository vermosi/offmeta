/**
 * Application entry point.
 * Mounts the React root.
 * @module main
 */

import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Auto-recover from stale dynamic-import chunks after a redeploy.
// Bounded reloads are tracked in sessionStorage to prevent infinite loops.
const RELOAD_KEY = '__offmeta_chunk_reload__';
const MAX_CHUNK_RELOAD_ATTEMPTS = 2;
function handleChunkError(reason: unknown) {
  const msg = String((reason as { message?: string })?.message ?? reason ?? '');
  if (
    /dynamically imported module|Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(
      msg,
    )
  ) {
    const count = parseInt(sessionStorage.getItem(RELOAD_KEY) ?? '0', 10);
    if (count < MAX_CHUNK_RELOAD_ATTEMPTS) {
      sessionStorage.setItem(RELOAD_KEY, String(count + 1));
      window.location.reload();
    } else {
      // eslint-disable-next-line no-console
      console.warn('OffMeta chunk reload limit reached; manual refresh may be needed.');
    }
  }
}
window.addEventListener('error', (e) => handleChunkError(e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) => handleChunkError(e.reason));

createRoot(document.getElementById('root')!).render(<App />);

