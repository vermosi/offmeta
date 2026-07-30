/**
 * Root application component. Always mounts the full router so the homepage
 * (SearchExperience) has BrowserRouter, providers, and the same shell as
 * every other route — matching the published production behavior.
 */

import { Suspense, useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { I18nProvider } from '@/lib/i18n';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import AppRoutes from './AppRoutes';

const routeFallback = <div className="min-h-screen bg-background" />;

const App = () => <AppShell />;

function AppShell() {
  useEffect(() => {
    const shell = document.getElementById('static-shell');
    if (shell) shell.style.display = 'none';
  }, []);

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
