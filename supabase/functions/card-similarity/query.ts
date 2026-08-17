interface SimilarityRequest {
  cardName: string;
  typeLine: string;
  colorIdentity?: string[];
  cmc?: number;
  prices?: { usd?: string | null };
  keywords?: string[];
}

const PRIMARY_TYPES = new Set([
  'artifact',
  'creature',
  'enchantment',
  'instant',
  'land',
  'planeswalker',
  'sorcery',
  'battle',
  'kindred',
]);

/** Colour-identity clause, or null for colourless cards. */
function identityClause(card: SimilarityRequest): string | null {
  if (!card.colorIdentity?.length) return null;
  return `id<=${card.colorIdentity.join('').toUpperCase()}`;
}

/** Base type clause(s) from the primary type line. */
function baseTypeClauses(card: SimilarityRequest): string[] {
  const primaryTypes = card.typeLine
    .replace(/Legendary\s*/i, '')
    .replace(/—.*/i, '')
    .trim()
    .split(/\s+/)
    .map((part) => part.toLowerCase())
    .filter((part) => PRIMARY_TYPES.has(part));
  return [...new Set(primaryTypes)].map((type) => `t:${type}`);
}

/** Price ceiling for budget alternatives. */
export function budgetCeiling(card: SimilarityRequest): number {
  const cardPrice = parseFloat(card.prices?.usd || '0');
  return cardPrice > 0 ? Math.max(2, Math.floor(cardPrice * 0.5)) : 5;
}

export function buildSimilarQuery(
  card: SimilarityRequest,
  mechanics: string[],
): string {
  const parts: string[] = [];

  const baseTypes = baseTypeClauses(card);
  if (baseTypes.length > 0) parts.push(...baseTypes);

  const identity = identityClause(card);
  if (identity) parts.push(identity);

  if (card.cmc !== undefined) {
    const lo = Math.max(0, card.cmc - 1);
    const hi = card.cmc + 1;
    parts.push(`mv>=${lo}`, `mv<=${hi}`);
  }

  parts.push(`-!"${card.cardName}"`);

  const kwParts: string[] = [];
  for (const kw of (card.keywords || []).slice(0, 2)) {
    const normalized = kw.toLowerCase().replace(/\s+/g, '-');
    kwParts.push(`kw:${normalized}`);
  }

  for (const mech of mechanics.slice(0, 2)) {
    if (mech === 'ETB') {
      parts.push('o:"enters the battlefield"');
    } else if (mech === 'death trigger') {
      parts.push('o:"when" o:"dies"');
    } else if (mech === 'tutor') {
      parts.push('o:"search your library"');
    } else if (mech === 'mana production') {
      parts.push('o:"add" o:"{"');
    } else {
      parts.push(`o:"${mech}"`);
    }
  }

  if (mechanics.length === 0 && kwParts.length > 0) {
    parts.push(...kwParts);
  }

  parts.push('order:name', 'dir:asc');
  return parts.join(' ');
}

export function buildBudgetQuery(
  card: SimilarityRequest,
  mechanics: string[],
): string {
  const parts: string[] = [];

  const baseTypes = baseTypeClauses(card);
  if (baseTypes.length > 0) parts.push(...baseTypes);

  const identity = identityClause(card);
  if (identity) parts.push(identity);

  if (mechanics.length > 0) {
    const mech = mechanics[0];
    if (mech === 'mana production') {
      parts.push('o:"add" o:"{"');
    } else if (mech === 'ETB') {
      parts.push('o:"enters the battlefield"');
    } else if (mech === 'tutor') {
      parts.push('o:"search your library"');
    } else {
      parts.push(`o:"${mech}"`);
    }
  }

  parts.push(`-!"${card.cardName}"`);
  parts.push(`usd<${budgetCeiling(card)}`);
  parts.push('order:usd', 'dir:asc');

  return parts.join(' ');
}
