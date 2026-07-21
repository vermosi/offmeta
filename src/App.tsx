/**
 * Root application component.
 * Keeps the homepage on a minimal code path and only loads the router/app
 * shell for non-root routes.
 */

import { lazy, Suspense, useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { I18nProvider } from '@/lib/i18n';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Index from '@/pages/Index';
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

  const isRootPath =
    typeof window !== 'undefined' && window.location.pathname === '/';

  if (isRootPath) {
    return (
      <I18nProvider>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <ErrorBoundary>
            <LandingPage />
          </ErrorBoundary>
        </ThemeProvider>
      </I18nProvider>
    );
  }

  return (
    <I18nProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <ErrorBoundary>
          <Suspense fallback={routeFallback}>
            <AppRoutes />
          </Suspense>
        </ErrorBoundary>
      </ThemeProvider>
    </I18nProvider>
  );
}

export default App;
