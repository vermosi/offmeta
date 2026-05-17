/**
 * Root application component.
 * Renders only the lightweight `Index` shell for `/`. Every other route is
 * code-split into the lazy `AppRoutes` module so the homepage entry bundle
 * doesn't include any non-root page references, FullAppProviders, or their
 * dependency chains.
 */

import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { I18nProvider } from '@/lib/i18n';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Index from './pages/Index';

const AppRoutes = lazy(() => import('./AppRoutes'));

const routeFallback = <div className="min-h-screen bg-background" />;

/**
 * Render `Index` directly for `/`. For any other path, mount the lazy
 * `AppRoutes` module which owns the full router + provider stack.
 */
function RouteSwitch() {
  const location = useLocation();
  const [hasNavigatedAway, setHasNavigatedAway] = useState(
    () => location.pathname !== '/',
  );

  useEffect(() => {
    if (location.pathname !== '/') setHasNavigatedAway(true);
  }, [location.pathname]);

  if (!hasNavigatedAway) {
    return (
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="*" element={<TriggerAppRoutes />} />
      </Routes>
    );
  }

  return (
    <Suspense fallback={routeFallback}>
      <AppRoutes />
    </Suspense>
  );
}

/** Renders nothing — triggers a state flip so AppRoutes mounts on next render. */
function TriggerAppRoutes() {
  return (
    <Suspense fallback={routeFallback}>
      <AppRoutes />
    </Suspense>
  );
}

const App = () => (
  <I18nProvider>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <BrowserRouter>
        <ErrorBoundary>
          <RouteSwitch />
        </ErrorBoundary>
      </BrowserRouter>
    </ThemeProvider>
  </I18nProvider>
);

export default App;
