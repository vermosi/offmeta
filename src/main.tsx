/**
 * Application entry point.
 * Registers the PWA service worker and mounts the React root.
 * @module main
 */

import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initPWA } from './lib/pwa/register';

// Register service worker for offline-first PWA support
initPWA();

createRoot(document.getElementById('root')!).render(<App />);
