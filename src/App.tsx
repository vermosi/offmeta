/**
 * Root application component.
 * Wires up providers (i18n, theme, query cache, tooltips, toasts)
 * and defines top-level routes via React Router.
 * All page components are lazy-loaded for optimal bundle splitting.
 * @module App
 */

import { lazy, Suspense, useEffect, useRef } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { usePrefetchPopularQueries } from '@/hooks/useSearchQuery';
import { useRealtimeCache } from '@/hooks/useRealtimeCache';
import { I18nProvider } from '@/lib/i18n';
import { AuthProvider } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

const Index = lazy(() => import('./pages/Index'));
const GuidesIndex = lazy(() => import('./pages/GuidesIndex'));
const GuidePage = lazy(() => import('./pages/GuidePage'));
const DocsIndex = lazy(() => import('./pages/DocsIndex'));
const SyntaxCheatSheet = lazy(() => import('./pages/SyntaxCheatSheet'));
const SavedSearches = lazy(() => import('./pages/SavedSearches'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const ProfileSettings = lazy(() => import('./pages/ProfileSettings'));
const AdminAnalytics = lazy(() => import('./pages/AdminAnalytics'));
const DeckRecommendations = lazy(() => import('./pages/DeckRecommendations'));
const FindMyCombos = lazy(() => import('./pages/FindMyCombos'));
const ArchetypesIndex = lazy(() => import('./pages/ArchetypesIndex'));
const ArchetypePage = lazy(() => import('./pages/ArchetypePage'));
const DeckBuilder = lazy(() => import('./pages/DeckBuilder'));
const DeckEditor = lazy(() => import('./pages/DeckEditor'));
const About = lazy(() => import('./pages/About'));
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

/**
 * Warms up the semantic-search edge function after a short idle period
 * to eliminate cold-start latency on the user's first real search.
 * The ping uses a cached, deterministic query so no AI is invoked.
 */
function useEdgeFunctionWarmup() {
  const warmedUp = useRef(false);

  useEffect(() => {
    if (warmedUp.current) return;

    const id = setTimeout(() => {
      if (warmedUp.current) return;
      warmedUp.current = true;

      // Fire-and-forget: a deterministic query that hits the cache layer
      // immediately, costing zero AI tokens and returning sub-200ms.
      supabase.functions
        .invoke('semantic-search', {
          body: { query: 'ping warmup', useCache: true },
        })
        .catch(() => {
          // Silently ignore — warmup is best-effort
        });
    }, 2000); // 2s after mount — after first paint & hydration settle

    return () => clearTimeout(id);
  }, []);
}

// Component to trigger prefetching, realtime sync, and edge function warmup
function AppInitializer() {
  usePrefetchPopularQueries();
  useRealtimeCache();
  useEdgeFunctionWarmup();
  return null;
}

const App = () => (
  <I18nProvider>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
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
                  <Route path="/saved" element={<SavedSearches />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/profile" element={<ProfileSettings />} />
                  <Route path="/admin/analytics" element={<AdminAnalytics />} />
                  <Route path="/deck-recs" element={<DeckRecommendations />} />
                  <Route path="/combos" element={<FindMyCombos />} />
                  <Route path="/archetypes" element={<ArchetypesIndex />} />
                  <Route path="/archetypes/:slug" element={<ArchetypePage />} />
                  <Route path="/deckbuilder" element={<DeckBuilder />} />
                  <Route path="/deckbuilder/:id" element={<DeckEditor />} />
                  <Route path="/about" element={<About />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </I18nProvider>
);

export default App;
