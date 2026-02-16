import { lazy, Suspense } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { usePrefetchPopularQueries } from '@/hooks/useSearchQuery';
import { useRealtimeCache } from '@/hooks/useRealtimeCache';

const Index = lazy(() => import('./pages/Index'));
const GuidesIndex = lazy(() => import('./pages/GuidesIndex'));
const GuidePage = lazy(() => import('./pages/GuidePage'));
const DocsIndex = lazy(() => import('./pages/DocsIndex'));
const SyntaxCheatSheet = lazy(() => import('./pages/SyntaxCheatSheet'));
const NotFound = lazy(() => import('./pages/NotFound'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - reduce refetches
      gcTime: 30 * 60 * 1000, // 30 minutes cache retention
      retry: 2, // Limit retries to avoid hammering on errors
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      refetchOnWindowFocus: false, // Prevent refetch storms
      refetchOnReconnect: false,
    },
  },
});

// Component to trigger prefetching and realtime sync after initial render
function AppInitializer() {
  usePrefetchPopularQueries();
  useRealtimeCache();
  return null;
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppInitializer />
        <BrowserRouter>
          <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/docs" element={<DocsIndex />} />
              <Route path="/docs/syntax" element={<SyntaxCheatSheet />} />
              <Route path="/guides" element={<GuidesIndex />} />
              <Route path="/guides/:slug" element={<GuidePage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
