/**
 * Runtime validator for Scryfall Tagger values in a generated query.
 *
 * The static vocabulary (`otagValidation.ts`) catches obvious hallucinations,
 * but it can also be stale — Scryfall adds and retires tags continuously, and
 * our generated vocabulary is only refreshed by a nightly job. A tag such as
 * `otag:finisher` looks plausible, passes a lenient check, and then silently
 * returns zero cards.
 *
 * This module resolves that at runtime:
 *   1. Extract every otag/atag token (including negated ones).
 *   2. Trust tags present in the generated vocabulary.
 *   3. Probe unknown tags against Scryfall once, then cache the verdict.
 *   4. Replace an unsupported tag with the closest supported suggestion when
 *      one exists, otherwise strip it and clean up the leftover boolean glue.
 *
 * It always fails open: if Scryfall is unreachable the query is left untouched.
 *
 * @module _shared/tagRuntimeValidator
 */

import {
  isKnownOracleTag,
  isKnownArtTag,
  suggestOracleTags,
  suggestArtTags,
} from './otagValidation.ts';

export type TagKind = 'oracle' | 'art';

/** Matches otag:/oracletag:/function: and art:/atag:/arttag: tokens. */
const TAG_TOKEN =
  /(-?)\b(otag|oracletag|function|atag|arttag|art):("?)([a-z0-9][a-z0-9-]*)\3/gi;

const ORACLE_PREFIXES = new Set(['otag', 'oracletag', 'function']);

const PROBE_TIMEOUT_MS = 4000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;
/** Hard cap on live probes per query so a bad translation cannot stall a request. */
const MAX_PROBES_PER_QUERY = 4;

type Verdict = { supported: boolean; expiresAt: number };

const verdictCache = new Map<string, Verdict>();
const inflight = new Map<string, Promise<boolean>>();

function cacheKey(kind: TagKind, tag: string): string {
  return `${kind}:${tag.toLowerCase()}`;
}

function readCache(kind: TagKind, tag: string): boolean | null {
  const entry = verdictCache.get(cacheKey(kind, tag));
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    verdictCache.delete(cacheKey(kind, tag));
    return null;
  }
  return entry.supported;
}

function writeCache(kind: TagKind, tag: string, supported: boolean): void {
  if (verdictCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = verdictCache.keys().next().value;
    if (oldest) verdictCache.delete(oldest);
  }
  verdictCache.set(cacheKey(kind, tag), {
    supported,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

/** Test seam: clears memoised verdicts. */
export function resetTagVerdictCache(): void {
  verdictCache.clear();
  inflight.clear();
}

/**
 * Asks Scryfall whether a tag matches at least one paper card.
 * A tag that matches nothing is useless in a query, whether it is misspelled,
 * retired, or simply never existed — all three are treated as unsupported.
 * Network failures resolve to `true` (fail open) so Scryfall downtime never
 * mangles an otherwise-valid query.
 */
export async function probeTagSupported(
  kind: TagKind,
  tag: string,
): Promise<boolean> {
  const cached = readCache(kind, tag);
  if (cached !== null) return cached;

  const key = cacheKey(kind, tag);
  const existing = inflight.get(key);
  if (existing) return existing;

  const prefix = kind === 'oracle' ? 'otag' : 'atag';
  const request = (async () => {
    try {
      const response = await scryfallFetch(
        `https://api.scryfall.com/cards/search?q=${encodeURIComponent(
          `${prefix}:${tag} game:paper`,
        )}&unique=cards&page=1`,
        { timeoutMs: PROBE_TIMEOUT_MS, retries: 0 },
      );

      // 404 = "no cards matched" — the tag indexes nothing.
      if (response.status === 404) {
        writeCache(kind, tag, false);
        return false;
      }
      if (response.status === 200) {
        const data = (await response.json()) as { total_cards?: number };
        const supported = (data.total_cards ?? 0) > 0;
        writeCache(kind, tag, supported);
        return supported;
      }
      // 400/429/5xx tell us nothing about the tag — do not cache.
      return true;
    } catch {
      return true;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, request);
  return request;
}

export interface TagRuntimeValidationResult {
  /** Query with unsupported tags replaced or removed. */
  query: string;
  /** True when nothing had to change. */
  valid: boolean;
  /** Human-readable notes suitable for surfacing as search assumptions. */
  warnings: string[];
  /** Tags dropped because no supported alternative existed. */
  removedTags: string[];
  /** `{ from, to }` pairs for tags swapped for a supported alternative. */
  replacedTags: { from: string; to: string }[];
}

interface ParsedTagToken {
  token: string;
  negated: boolean;
  prefix: string;
  kind: TagKind;
  tag: string;
}

function parseTagTokens(query: string): ParsedTagToken[] {
  const tokens: ParsedTagToken[] = [];
  const seen = new Set<string>();
  TAG_TOKEN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TAG_TOKEN.exec(query)) !== null) {
    const [token, negation, prefix, , tag] = match;
    if (seen.has(token.toLowerCase())) continue;
    seen.add(token.toLowerCase());
    tokens.push({
      token,
      negated: negation === '-',
      prefix: prefix.toLowerCase(),
      kind: ORACLE_PREFIXES.has(prefix.toLowerCase()) ? 'oracle' : 'art',
      tag: tag.toLowerCase(),
    });
  }
  return tokens;
}

/** Removes boolean glue and empty groups left behind by a stripped token. */
export function cleanupOrphanedOperators(query: string): string {
  let cleaned = query;
  for (let i = 0; i < 3; i++) {
    const before = cleaned;
    cleaned = cleaned
      .replace(/\s+/g, ' ')
      .replace(/\(\s*(?:or|and)\s+/gi, '(')
      .replace(/\s+(?:or|and)\s*\)/gi, ')')
      .replace(/\b(or|and)\s+(?:or|and)\b/gi, '$1')
      .replace(/\(\s*\)/g, '')
      .replace(/^\s*(?:or|and)\s+/i, '')
      .replace(/\s+(?:or|and)\s*$/i, '')
      .trim();
    // Collapse a group that now holds a single term: "(t:creature)" → "t:creature"
    cleaned = cleaned.replace(/\((\s*-?[^\s()]+\s*)\)/g, '$1').trim();
    if (cleaned === before) break;
  }
  return cleaned.replace(/\s+/g, ' ').trim();
}

function removeToken(query: string, token: string): string {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return query.replace(new RegExp(escaped, 'gi'), ' ');
}

/**
 * Validates every Tagger value in a generated query at runtime and repairs
 * the query when a tag is unsupported.
 */
export async function validateGeneratedTags(
  query: string,
  options: {
    /** Injectable probe, primarily for tests. */
    probe?: (kind: TagKind, tag: string) => Promise<boolean>;
    /** Skip the network entirely and rely on the static vocabulary. */
    offline?: boolean;
  } = {},
): Promise<TagRuntimeValidationResult> {
  const probe = options.probe ?? probeTagSupported;
  const tokens = parseTagTokens(query);

  const result: TagRuntimeValidationResult = {
    query,
    valid: true,
    warnings: [],
    removedTags: [],
    replacedTags: [],
  };

  if (tokens.length === 0) return result;

  let working = query;
  let probesUsed = 0;

  for (const token of tokens) {
    const knownStatically =
      token.kind === 'oracle'
        ? isKnownOracleTag(token.tag)
        : isKnownArtTag(token.tag);
    if (knownStatically) continue;

    // Statically unknown: confirm with Scryfall before touching the query, the
    // vocabulary snapshot may simply predate a newly added tag.
    let supported = false;
    if (!options.offline) {
      if (probesUsed >= MAX_PROBES_PER_QUERY) continue;
      probesUsed++;
      supported = await probe(token.kind, token.tag);
    }
    if (supported) continue;

    const prefix = token.kind === 'oracle' ? 'otag' : 'atag';
    const suggestions =
      token.kind === 'oracle'
        ? suggestOracleTags(token.tag, 3)
        : suggestArtTags(token.tag, 3);

    // A negated tag that matches nothing is harmless — dropping it is enough,
    // never substitute a different tag into a negation.
    let replacement: string | null = null;
    if (!token.negated) {
      for (const candidate of suggestions) {
        if (candidate === token.tag) continue;
        if (options.offline) {
          replacement = candidate;
          break;
        }
        if (probesUsed >= MAX_PROBES_PER_QUERY) break;
        probesUsed++;
        if (await probe(token.kind, candidate)) {
          replacement = candidate;
          break;
        }
      }
    }

    if (replacement) {
      working = working.replace(
        new RegExp(token.token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
        `${token.negated ? '-' : ''}${prefix}:${replacement}`,
      );
      result.replacedTags.push({
        from: `${prefix}:${token.tag}`,
        to: `${prefix}:${replacement}`,
      });
      result.warnings.push(
        `${prefix}:${token.tag} is not a Scryfall tag — used ${prefix}:${replacement} instead`,
      );
    } else {
      working = removeToken(working, token.token);
      result.removedTags.push(`${prefix}:${token.tag}`);
      result.warnings.push(
        `${prefix}:${token.tag} is not a Scryfall tag — removed it from the search`,
      );
    }
    result.valid = false;
  }

  if (result.valid) return result;

  const cleaned = cleanupOrphanedOperators(working);

  // Never hand back an empty query: keep the original so the caller's own
  // fallback strategies (deterministic query, name lookup) still have input.
  if (!cleaned) {
    return {
      ...result,
      query,
      warnings: [
        ...result.warnings,
        'Every tag in the generated query was unsupported — kept the original query',
      ],
    };
  }

  return { ...result, query: cleaned };
}
