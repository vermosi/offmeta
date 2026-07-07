/**
 * Root application component.
 * Renders only the lightweight `Index` shell for `/`. Every other route is
 * code-split into the lazy `AppRoutes` module so the homepage entry bundle
 * doesn't include any non-root page references, FullAppProviders, or their
 * dependency chains.
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { I18nProvider } from '@/lib/i18n';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const AppRoutes = lazy(() => import('./AppRoutes'));

const routeFallback = <div className="min-h-screen bg-background" />;

const App = () => (
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

export default App;
