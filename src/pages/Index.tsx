/**
 * Homepage entry.
 *
 * The canonical homepage is the search experience. `/` and `/search/:slug`
 * share the same implementation so the hero, search bar, and results flow
 * never drift apart.
 */

import SearchExperience from './SearchExperience';

export default function Index() {
  return <SearchExperience />;
}
