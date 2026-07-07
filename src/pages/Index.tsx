/**
 * Homepage entry.
 *
 * The canonical homepage IS the search experience (cinematic hero + search
 * bar in its empty state, results grid once a query runs). A previous
 * lightweight `IndexShell` variant was removed so `/` and `/search/:slug`
 * share exactly one implementation — no duplicated hero, header, or search
 * form to drift out of sync.
 *
 * `App.tsx` imports this module eagerly for `/`; `AppRoutes.tsx` lazy-loads
 * the same `SearchExperience` component for `/search/:slug`.
 */

import SearchExperience from './SearchExperience';

export default function Index() {
  return <SearchExperience />;
}
