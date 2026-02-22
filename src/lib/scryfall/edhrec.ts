/**
 * EDHREC rank utilities for converting raw rank numbers into
 * human-readable percentiles and tier badges.
 * @module lib/scryfall/edhrec
 */

/** Approximate number of unique cards tracked by EDHREC */
const EDHREC_TOTAL_CARDS = 30_000;

export type EdhrecTier = 'staple' | 'popular' | 'common' | 'niche' | 'obscure';

/**
 * Convert an EDHREC rank into a human-readable percentile string.
 * Lower rank = more popular (rank 1 is the most played card).
 *
 * @param rank - Raw EDHREC rank (1-based)
 * @returns Human-readable percentile, e.g. "Top 2%"
 */
export function getEdhrecPercentile(rank: number): string {
  if (rank <= 0) return 'N/A';
  const percentile = (rank / EDHREC_TOTAL_CARDS) * 100;

  if (percentile <= 1) return 'Top 1%';
  if (percentile <= 5) return `Top ${Math.ceil(percentile)}%`;
  if (percentile <= 10) return `Top ${Math.round(percentile)}%`;
  if (percentile <= 25) return `Top ${Math.round(percentile)}%`;
  if (percentile <= 50) return `Top ${Math.round(percentile)}%`;
  return `Top ${Math.round(percentile)}%`;
}

/**
 * Categorize an EDHREC rank into a tier for badge styling.
 *
 * @param rank - Raw EDHREC rank (1-based)
 * @returns Tier category
 */
export function getEdhrecTier(rank: number): EdhrecTier {
  if (rank <= 0) return 'obscure';
  if (rank <= 300) return 'staple';     // Top 1%
  if (rank <= 1500) return 'popular';   // Top 5%
  if (rank <= 6000) return 'common';    // Top 20%
  if (rank <= 15000) return 'niche';    // Top 50%
  return 'obscure';
}
