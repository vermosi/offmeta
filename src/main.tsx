import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initPWA } from './lib/pwa';

// Initialize PWA service worker
initPWA();

createRoot(document.getElementById('root')!).render(<App />);
