/**
 * Providers needed by the full interactive app.
 * Kept out of the `/` homepage shell so first paint does not download auth,
 * query-cache, tooltip, toast, or backend client bundles.
 */

import { Suspense, type ReactNode, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { AuthProvider } from '@/components/AuthProvider';
import AppInitializer from '@/components/AppInitializer';
import { ScrollToTopOnNavigate } from '@/components/ScrollToTopOnNavigate';
import { useLocation } from 'react-router-dom';
import { useAnalytics } from '@/hooks/useAnalytics';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

export default function FullAppProviders({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { trackRouteView } = useAnalytics();
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const key = `${location.pathname}${location.search}${location.hash}`;
    if (lastKeyRef.current === key) return;

    lastKeyRef.current = key;
    trackRouteView({
      path: location.pathname,
      search: location.search || undefined,
      referrer: document.referrer || undefined,
    });
  }, [location.pathname, location.search, location.hash, trackRouteView]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Suspense fallback={null}>
            <Toaster />
            <Sonner />
            <AppInitializer />
            <ScrollToTopOnNavigate />
          </Suspense>
          {children}
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
