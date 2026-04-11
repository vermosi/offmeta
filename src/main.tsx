/**
 * Application entry point.
 * Mounts the React root.
 * @module main
 */

import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Hide the static shell once React takes over
const shell = document.getElementById('static-shell');
if (shell) shell.style.display = 'none';

createRoot(document.getElementById('root')!).render(<App />);
