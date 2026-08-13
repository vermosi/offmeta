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
  /**
   * Oracle-text phrases that prove a card belongs to this intent. Used to
   * label representative results and to count real matches. Cards matching
   * nothing are dropped rather than labelled loosely.
   */
  match?: readonly string[];
}

/** An adjacent concept surfaced under "More like this". */
export interface AdjacentConcept {
  label: string;
  /** Natural-language query that runs in OffMeta search. */
  query: string;
  /** Optional intentional landing page for the same concept. */
  href?: string;
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
  /** Short topic token for the technical summary, e.g. "TREASURE HATE". */
  summaryTopic?: string;
  explanation?: LandingExplanation;
  /** Adjacent concepts for the "More like this" discovery band. */
  adjacentConcepts?: AdjacentConcept[];
  /** Plain natural-language queries rendered as mono text links. */
  relatedSearches?: string[];
  relatedPages?: RelatedPageLink[];
  /** Breadcrumb label for the final crumb. */
  breadcrumbLabel: string;
}
