/**
 * Application entry point.
 * Mounts the React root.
 * @module main
 */

import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Auto-recover from stale dynamic-import chunks after a redeploy.
// Reload once (guarded via sessionStorage) so users don't see a blank screen.
const RELOAD_KEY = '__offmeta_chunk_reload__';
function handleChunkError(reason: unknown) {
  const msg = String((reason as { message?: string })?.message ?? reason ?? '');
  if (
    /dynamically imported module|Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(
      msg,
    )
  ) {
    if (!sessionStorage.getItem(RELOAD_KEY)) {
      sessionStorage.setItem(RELOAD_KEY, '1');
      window.location.reload();
    }
  }
}
window.addEventListener('error', (e) => handleChunkError(e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) => handleChunkError(e.reason));

createRoot(document.getElementById('root')!).render(<App />);

