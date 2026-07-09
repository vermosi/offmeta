import { auth, defineMcp } from '@lovable.dev/mcp-js';
import searchCards from './tools/search-cards';
import listMyDecks from './tools/list-my-decks';
import getDeck from './tools/get-deck';
import listSavedSearches from './tools/list-saved-searches';
import getCollectionSummary from './tools/get-collection-summary';

// The OAuth issuer MUST be the direct supabase.co host, derived from the
// project ref (not SUPABASE_URL, which is the .lovable.cloud proxy on managed
// Cloud projects). Vite inlines VITE_SUPABASE_PROJECT_ID as a literal at build
// time, so this stays import-safe. The fallback keeps the issuer well-formed
// during the throwaway manifest-extract eval, where no token verifies.
const projectRef =
  import.meta.env.VITE_SUPABASE_PROJECT_ID ?? 'project-ref-unset';

export default defineMcp({
  name: 'offmeta-mcp',
  title: 'OffMeta',
  version: '0.1.0',
  instructions:
    'Tools for OffMeta, a natural-language Magic: The Gathering card search app. `search_cards` runs Scryfall syntax queries (append game:paper is automatic). The other tools read the signed-in user\'s decks, saved searches, and collection stats. All user tools require the caller to be signed in via OAuth.',
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: 'authenticated',
  }),
  tools: [
    searchCards,
    listMyDecks,
    getDeck,
    listSavedSearches,
    getCollectionSummary,
  ],
});
