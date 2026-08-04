/**
 * Application entry point.
 * Mounts the React root.
 * @module main
 */

import { createRoot } from 'react-dom/client';
import { initializeAnalytics } from '@/lib/analytics';
import { initErrorMonitoring } from '@/lib/monitoring';
import App from './App.tsx';
import './index.css';


// Initialize optional third-party analytics providers from Lovable connectors.
// Keys are only present in the published environment; missing keys are ignored.
initializeAnalytics({
  googleAnalyticsMeasurementId: import.meta.env
    .VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY,
  posthogProjectToken: import.meta.env.VITE_LOVABLE_CONNECTOR_POSTHOG_API_KEY,
  posthogRegion: import.meta.env.VITE_LOVABLE_CONNECTOR_POSTHOG_REGION,
});

// Capture uncaught errors / rejections into public.error_events so page-level
// failures are reported automatically alongside backend pipeline failures.
initErrorMonitoring();


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

// The app booted successfully — clear the reload budget so a future stale
// chunk (e.g. after another deploy or dev-server restart) can recover again
// instead of hitting the "limit reached" branch and leaving a blank screen.
window.addEventListener('load', () => {
  sessionStorage.removeItem(RELOAD_KEY);
});


