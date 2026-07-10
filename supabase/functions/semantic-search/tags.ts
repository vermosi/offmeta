type ScryfallTagRecord = {
  label?: string;
  aliases?: string[];
};

const ScryfallHeaders = {
  Accept: 'application/json',
  'User-Agent': 'OffMetaSemanticSearch/1.0',
};

const TAGS_BULK_DATA_URL = 'https://api.scryfall.com/bulk-data';
const TAGS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const LEGACY_TAGS = [
  'ramp',
  'mana-rock',
  'manarock',
  'mana-dork',
  'mana-doubler',
  'mana-sink',
  'ritual',
  'draw',
  'cantrip',
  'loot',
  'wheel',
  'impulse-draw',
  'scry',
  'tutor',
  'removal',
  'spot-removal',
  'creature-removal',
  'artifact-removal',
  'enchantment-removal',
  'planeswalker-removal',
  'boardwipe',
  'board-wipe',
  'mass-removal',
  'graveyard-hate',
  'recursion',
  'reanimate',
  'lifegain',
  'soul-warden-ability',
  'burn',
  'fog',
  'combat-trick',
  'blink',
  'flicker',
  'bounce',
  'copy',
  'copy-permanent',
  'copy-spell',
  'clone',
  'hatebear',
  'pillowfort',
  'theft',
  'threaten',
  'sacrifice-outlet',
  'free-sacrifice-outlet',
  'death-trigger',
  'synergy-sacrifice',
  'synergy-lifegain',
  'synergy-discard',
  'synergy-equipment',
  'synergy-proliferate',
  'extra-turn',
  'extra-combat',
  'polymorph',
  'egg',
  'activate-from-graveyard',
  'cast-from-graveyard',
  'untapper',
  'tapper',
  'gives-flash',
  'gives-hexproof',
  'gives-haste',
  'gives-flying',
  'gives-trample',
  'gives-vigilance',
  'gives-deathtouch',
  'gives-lifelink',
  'gives-first-strike',
  'gives-double-strike',
  'gives-menace',
  'gives-reach',
  'gives-protection',
  'gives-indestructible',
  'landfall',
  'extra-land',
  'enchantress',
  'discard-outlet',
  'mulch',
  'lord',
  'anthem',
  'self-mill',
  'graveyard-order-matters',
  'win-condition',
  'counters-matter',
  'counter-doubler',
  'counter-movement',
  'cost-reducer',
  'overrun',
  'counter',
  'pinger',
  'evasion',
  'rummage',
  'activated-ability',
  'affinity',
  'alternate-win-condition',
  'balance',
  'banish',
  'battalion',
  'bite',
  'bribery',
  'bushido',
  'naturalize',
  'pacifism',
  'persist',
  'plunder',
  'pseudo-haste',
  'punisher',
  'regrowth',
  'removal-artifact',
  'removal-creature',
  'removal-enchantment',
  'removal-land',
  'removal-planeswalker',
  'revolt',
  'scry',
  'surveil',
  'painland',
  'bounceland',
  'boltland',
  'attack-trigger',
] as const;

const TAG_ALIAS_NORMALIZATION: Record<string, string> = {
  'board-wipe': 'boardwipe',
  'boardwipes': 'boardwipe',
  'board wipes': 'boardwipe',
  'manarock': 'mana-rock',
  'manarocks': 'mana-rock',
  'mana-ramp': 'ramp',
  'mass-removal': 'boardwipe',
  'creature-board-wipe': 'boardwipe',
};

type TagRegistry = {
  knownOtags: Set<string>;
  canonicalByAlias: Map<string, string>;
  source: 'api' | 'fallback';
};

let cachedRegistry: { value: TagRegistry; timestamp: number } | null = null;

function addTag(
  knownOtags: Set<string>,
  canonicalByAlias: Map<string, string>,
  label: string,
  aliases: string[] | undefined,
): void {
  const canonical = label.toLowerCase().trim();
  if (!canonical) return;
  knownOtags.add(canonical);
  canonicalByAlias.set(canonical, canonical);
  for (const alias of aliases ?? []) {
    const normalized = alias.toLowerCase().trim();
    if (!normalized) continue;
    canonicalByAlias.set(normalized, canonical);
  }
}

async function loadRegistryFromApi(): Promise<TagRegistry> {
  const bulkResponse = await fetch(TAGS_BULK_DATA_URL, {
    headers: ScryfallHeaders,
  });
  if (!bulkResponse.ok) {
    throw new Error(`Bulk data index request failed: ${bulkResponse.status}`);
  }

  const bulkData = (await bulkResponse.json()) as {
    data?: Array<{ name?: string; download_uri?: string }>;
  };
  const oracleTagsDownloadUri = bulkData.data?.find(
    (item) => item.name === 'Oracle Tags',
  )?.download_uri;
  if (!oracleTagsDownloadUri) {
    throw new Error('Oracle Tags bulk data URI not found');
  }

  const tagsResponse = await fetch(oracleTagsDownloadUri, {
    headers: ScryfallHeaders,
  });
  if (!tagsResponse.ok) {
    throw new Error(`Oracle tags request failed: ${tagsResponse.status}`);
  }

  const tags = (await tagsResponse.json()) as ScryfallTagRecord[];
  const knownOtags = new Set<string>();
  const canonicalByAlias = new Map<string, string>();

  for (const tag of tags) {
    if (typeof tag?.label === 'string') {
      addTag(knownOtags, canonicalByAlias, tag.label, tag.aliases);
    }
  }

  // Preserve our app-specific semantic tags that are not real Scryfall tags.
  // These keep the deterministic translator working while the live registry
  // handles canonical Scryfall tags and aliases.
  for (const tag of LEGACY_TAGS) {
    knownOtags.add(tag.toLowerCase());
    canonicalByAlias.set(tag.toLowerCase(), tag.toLowerCase());
  }

  for (const [alias, canonical] of Object.entries(TAG_ALIAS_NORMALIZATION)) {
    canonicalByAlias.set(alias, canonical);
  }

  return { knownOtags, canonicalByAlias, source: 'api' };
}

function loadFallbackRegistry(): TagRegistry {
  const knownOtags = new Set<string>(LEGACY_TAGS.map((tag) => tag.toLowerCase()));
  const canonicalByAlias = new Map<string, string>();

  for (const tag of knownOtags) {
    canonicalByAlias.set(tag, tag);
  }
  for (const [alias, canonical] of Object.entries(TAG_ALIAS_NORMALIZATION)) {
    canonicalByAlias.set(alias, canonical);
  }

  return { knownOtags, canonicalByAlias, source: 'fallback' };
}

async function loadRegistry(): Promise<TagRegistry> {
  if (cachedRegistry && Date.now() - cachedRegistry.timestamp < TAGS_CACHE_TTL_MS) {
    return cachedRegistry.value;
  }

  try {
    const value = await loadRegistryFromApi();
    cachedRegistry = { value, timestamp: Date.now() };
    return value;
  } catch {
    const value = loadFallbackRegistry();
    cachedRegistry = { value, timestamp: Date.now() };
    return value;
  }
}

const registry = await loadRegistry();

export const KNOWN_OTAGS = registry.knownOtags;

export function resolveOtag(tag: string): string {
  const normalized = tag.toLowerCase().trim();
  return registry.canonicalByAlias.get(normalized) ?? normalized;
}

export function isKnownOtag(tag: string): boolean {
  return registry.knownOtags.has(resolveOtag(tag));
}

export function getOtagRegistrySource(): 'api' | 'fallback' {
  return registry.source;
}
