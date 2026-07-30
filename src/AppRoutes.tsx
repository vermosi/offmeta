/**
 * Non-root route table. Imported lazily by App so the `/` homepage entry
 * bundle never pays for any other page's lazy() pointers, FullAppProviders,
 * or chunk metadata. This module — and every page it references — is only
 * fetched once the user navigates away from `/`.
 */

import { lazy, Suspense, type ReactElement } from 'react';
import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom';
import FullAppProviders from '@/components/FullAppProviders';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Index from './pages/Index';

const GuidesIndex = lazy(() => import('./pages/GuidesIndex'));
const GuidePage = lazy(() => import('./pages/GuidePage'));
const DocsIndex = lazy(() => import('./pages/DocsIndex'));
const SyntaxCheatSheet = lazy(() => import('./pages/SyntaxCheatSheet'));
const SavedSearches = lazy(() => import('./pages/SavedSearches'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const ProfileSettings = lazy(() => import('./pages/ProfileSettings'));
const AdminAnalytics = lazy(() => import('./pages/AdminAnalytics'));
const AdminCuratedSearches = lazy(() => import('./pages/AdminCuratedSearches'));
const DeckRecommendations = lazy(() => import('./pages/DeckRecommendations'));
const FindMyCombos = lazy(() => import('./pages/FindMyCombos'));
const ArchetypesIndex = lazy(() => import('./pages/ArchetypesIndex'));
const ArchetypePage = lazy(() => import('./pages/ArchetypePage'));
const DeckBuilder = lazy(() => import('./pages/DeckBuilder'));
const DeckEditor = lazy(() => import('./pages/DeckEditor'));
const PublicDeckView = lazy(() => import('./pages/PublicDeckView'));
const BrowseDecks = lazy(() => import('./pages/BrowseDecks'));
const BrowseSearches = lazy(() => import('./pages/BrowseSearches'));
const About = lazy(() => import('./pages/About'));
const Collection = lazy(() => import('./pages/Collection'));
const MarketTrends = lazy(() => import('./pages/MarketTrends'));
const CardPage = lazy(() => import('./pages/CardPage'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const AiIndex = lazy(() => import('./pages/AiIndex'));
const AiPage = lazy(() => import('./pages/AiPage'));
const AdminSeoPages = lazy(() => import('./pages/AdminSeoPages'));
const NotFound = lazy(() => import('./pages/NotFound'));
const SearchExperience = lazy(() => import('./pages/SearchExperience'));
const OAuthConsent = lazy(() => import('./pages/OAuthConsent'));

const routeFallback = <div className="min-h-screen bg-background" />;
// Per-route ErrorBoundary so a lazy-chunk load failure or render crash on one
// page doesn't blank the whole app via the root boundary.
const withFullApp = (element: ReactElement) => (
  <ErrorBoundary>
    <Suspense fallback={routeFallback}>{element}</Suspense>
  </ErrorBoundary>
);

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={routeFallback}>
        <Routes>
          <Route
            element={
              <FullAppProviders>
                <Outlet />
              </FullAppProviders>
            }
          >
            <Route path="/" element={withFullApp(<Index />)} />
            <Route path="/search/:slug" element={withFullApp(<SearchExperience />)} />
            <Route path="/docs" element={withFullApp(<DocsIndex />)} />
            <Route path="/docs/syntax" element={withFullApp(<SyntaxCheatSheet />)} />
            <Route path="/guides" element={withFullApp(<GuidesIndex />)} />
            <Route path="/guides/:slug" element={withFullApp(<GuidePage />)} />
            <Route path="/saved" element={withFullApp(<SavedSearches />)} />
            <Route path="/reset-password" element={withFullApp(<ResetPassword />)} />
            <Route path="/profile" element={withFullApp(<ProfileSettings />)} />
            <Route path="/admin/analytics" element={withFullApp(<AdminAnalytics />)} />
            <Route path="/admin/curated-searches" element={withFullApp(<AdminCuratedSearches />)} />
            <Route path="/deck-recs" element={withFullApp(<DeckRecommendations />)} />
            <Route path="/combos" element={withFullApp(<FindMyCombos />)} />
            <Route path="/archetypes" element={withFullApp(<ArchetypesIndex />)} />
            <Route path="/archetypes/:slug" element={withFullApp(<ArchetypePage />)} />
            <Route path="/deckbuilder" element={withFullApp(<DeckBuilder />)} />
            <Route path="/deckbuilder/:id" element={withFullApp(<DeckEditor />)} />
            <Route path="/deck/:id" element={withFullApp(<PublicDeckView />)} />
            <Route path="/decks" element={withFullApp(<BrowseDecks />)} />
            <Route path="/browse-searches" element={withFullApp(<BrowseSearches />)} />
            <Route path="/about" element={withFullApp(<About />)} />
            <Route path="/collection" element={withFullApp(<Collection />)} />
            <Route path="/market" element={withFullApp(<MarketTrends />)} />
            <Route path="/cards/:slug" element={withFullApp(<CardPage />)} />
            <Route path="/user/:userId" element={withFullApp(<PublicProfile />)} />
            <Route path="/ai" element={withFullApp(<AiIndex />)} />
            <Route path="/ai/:slug" element={withFullApp(<AiPage />)} />
            <Route path="/admin/seo-pages" element={withFullApp(<AdminSeoPages />)} />
            <Route path="/.lovable/oauth/consent" element={withFullApp(<OAuthConsent />)} />
            <Route path="*" element={withFullApp(<NotFound />)} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
