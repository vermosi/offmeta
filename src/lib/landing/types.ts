/**
 * Landing page system types.
 *
 * Landing pages are explicitly declared entrances into OffMeta search.
 * Nothing here is generated combinatorially: a page exists only when a
 * config object for it exists, and it is only indexable when the config
 * says so.
 */

export type LandingFamily =
  | 'role'
  | 'problem'
  | 'color-role'
  | 'commander-role'
  | 'alternatives'
  | 'comparison';

/** A single way of approaching the page's search problem. */
export interface IntentPath {
  /** Short editorial label, e.g. "REPEATABLE". */
  label: string;
  /** One-line explanation of what this angle means. */
  description: string;
  /** Natural-language query executed when the path is clicked. */
  query: string;
}

export interface RelatedPageLink {
  label: string;
  href: string;
  note?: string;
}

export interface LandingExplanation {
  title: string;
  paragraphs: string[];
}

export interface LandingPageConfig {
  /** Absolute site path, e.g. "/mtg/card-draw". */
  path: string;
  family: LandingFamily;
  /**
   * Only true for pages with distinct intent, unique copy, curated paths and
   * real internal links. Everything else stays noindex.
   */
  indexable: boolean;
  /** Technical index notation, e.g. ["CARD INDEX", "CARD DRAW"]. */
  indexTrail: string[];
  /** SEO title (without the site suffix). */
  title: string;
  description: string;
  /** Uppercase Archivo statement line. */
  headline: string;
  /** Optional italic Fraunces line beneath the headline. */
  headlineEmphasis?: string;
  /** Supporting sentence under the hero. */
  lede: string;
  /** Query pre-filled into the contextual search field. */
  searchQuery: string;
  intentPathsTitle?: string;
  intentPaths: IntentPath[];
  /** Scryfall query used to show a few real cards. Omit to hide the section. */
  representativeQuery?: string;
  representativeLabel?: string;
  explanation?: LandingExplanation;
  /** Plain natural-language queries rendered as mono text links. */
  relatedSearches?: string[];
  relatedPages?: RelatedPageLink[];
  /** Breadcrumb label for the final crumb. */
  breadcrumbLabel: string;
}
