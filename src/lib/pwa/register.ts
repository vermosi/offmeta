/* eslint-disable no-console */
/**
 * PWA utilities for service worker registration and updates.
 * @module lib/pwa
 */

import { registerSW } from 'virtual:pwa-register';

/**
 * Registers the service worker and sets up auto-update handling.
 * Called once on app initialization.
 */
export function initPWA(): void {
  if (import.meta.env.DEV) {
    console.log('[PWA] Skipping registration in development mode');
    return;
  }

  try {
    const updateSW = registerSW({
      onNeedRefresh() {
        // Prompt user to refresh for new content
        if (confirm('New version available! Reload to update?')) {
          updateSW(true);
        }
      },
      onOfflineReady() {
        console.log('[PWA] App ready to work offline');
      },
      onRegistered(registration) {
        console.log('[PWA] Service worker registered', registration);

        // Check for updates every hour
        if (registration) {
          setInterval(
            () => {
              registration.update();
            },
            60 * 60 * 1000,
          );
        }
      },
      onRegisterError(error) {
        console.error('[PWA] Service worker registration failed:', error);
      },
    });
  } catch (error) {
    console.error('[PWA] Failed to initialize:', error);
  }
}
