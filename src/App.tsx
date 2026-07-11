/**
 * Root application component.
 * Renders the router shell and delegates route-level code splitting to
 * `AppRoutes` itself. Keeping the route table eager lets the homepage start
 * rendering sooner, while individual non-home pages still stay lazy.
 */

import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { I18nProvider } from '@/lib/i18n';
import { ErrorBoundary } from '@/components/ErrorBoundary';
const AppRoutes = lazy(() => import('./AppRoutes'));

const routeFallback = <div className="min-h-screen bg-background" />;

const App = () => (
  <AppShell />
);

function AppShell() {
  useEffect(() => {
    const shell = document.getElementById('static-shell');
    if (shell) shell.style.display = 'none';
  }, []);

  return (
    <I18nProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <BrowserRouter>
          <ErrorBoundary>
            <Suspense fallback={routeFallback}>
              <AppRoutes />
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </ThemeProvider>
    </I18nProvider>
  );
}

export default App;
