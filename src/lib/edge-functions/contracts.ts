export type DeckCategorizeRequest = {
  cards?: unknown;
};

export type DeckSuggestRequest = {
  commander?: unknown;
  cards?: unknown;
  color_identity?: unknown;
  format?: unknown;
};

export type FetchMoxfieldDeckRequest = {
  url?: unknown;
};

export type ComboSearchRequest = {
  action?: unknown;
  cardName?: unknown;
  commanders?: unknown;
  cards?: unknown;
};

export type ContractResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateDeckCategorizeRequest(
  body: DeckCategorizeRequest,
): ContractResult<{ cards: string[] }> {
  const cards = body.cards;
  if (!Array.isArray(cards) || cards.length === 0) {
    return { ok: false, error: 'cards array is required', status: 400 };
  }
  if (cards.length > 100) {
    return { ok: false, error: 'Max 100 cards per request', status: 400 };
  }

  const normalized: string[] = [];
  for (const card of cards) {
    if (typeof card === 'string') {
      if (card.length > 200) {
        return { ok: false, error: 'Card name exceeds 200 character limit', status: 400 };
      }
      normalized.push(card);
      continue;
    }

    if (!isUnknownRecord(card) || typeof card.name !== 'string') {
      return { ok: false, error: 'Invalid card name', status: 400 };
    }

    if (card.name.length > 200) {
      return { ok: false, error: 'Card name exceeds 200 character limit', status: 400 };
    }

    normalized.push(card.name);
  }

  return { ok: true, data: { cards: normalized } };
}

export function validateDeckSuggestRequest(
  body: DeckSuggestRequest,
): ContractResult<{
  commander: string | null;
  cards: Array<{ name: string; category?: string }>;
  colorIdentity: string[];
  format: string;
}> {
  const cards = body.cards;
  if (!Array.isArray(cards) || cards.length === 0) {
    return { ok: false, error: 'cards array is required', status: 400 };
  }

  const normalizedCards: Array<{ name: string; category?: string }> = [];
  for (const card of cards) {
    if (!isUnknownRecord(card) || typeof card.name !== 'string') {
      return { ok: false, error: 'Invalid card payload', status: 400 };
    }
    if (card.name.length > 200) {
      return { ok: false, error: 'Card name exceeds 200 character limit', status: 400 };
    }
    normalizedCards.push({
      name: card.name,
      category: typeof card.category === 'string' ? card.category : undefined,
    });
  }

  const commander = typeof body.commander === 'string' ? body.commander : null;
  const format = typeof body.format === 'string' ? body.format : 'commander';

  const colorIdentity =
    Array.isArray(body.color_identity) &&
    body.color_identity.every((entry) => typeof entry === 'string')
      ? body.color_identity
      : [];

  return {
    ok: true,
    data: {
      commander,
      cards: normalizedCards,
      colorIdentity,
      format,
    },
  };
}

export function validateFetchMoxfieldDeckRequest(
  body: FetchMoxfieldDeckRequest,
): ContractResult<{ publicId: string }> {
  const url = body.url;
  if (!url || typeof url !== 'string') {
    return { ok: false, error: 'Missing url parameter', status: 400 };
  }

  let publicId = url.trim();
  const moxfieldMatch = publicId.match(/moxfield\.com\/decks\/([A-Za-z0-9_-]+)/);
  if (moxfieldMatch) {
    publicId = moxfieldMatch[1];
  }

  if (!/^[A-Za-z0-9_-]+$/.test(publicId) || publicId.length > 50) {
    return { ok: false, error: 'Invalid Moxfield deck URL or ID', status: 400 };
  }

  return { ok: true, data: { publicId } };
}

export function validateComboSearchRequest(
  body: ComboSearchRequest,
): ContractResult<
  | { action: 'card'; cardName: string }
  | { action: 'deck'; commanders: string[]; cards: string[] }
> {
  if (body.action === 'card') {
    const cardName = typeof body.cardName === 'string' ? body.cardName.trim() : '';
    if (!cardName || cardName.length > 200) {
      return { ok: false, error: 'Invalid cardName', status: 400 };
    }
    return { ok: true, data: { action: 'card', cardName } };
  }

  if (body.action === 'deck') {
    const commanders = isStringArray(body.commanders) ? body.commanders.slice(0, 5) : [];
    const cards = isStringArray(body.cards) ? body.cards.slice(0, 200) : [];

    if (cards.length === 0 && commanders.length === 0) {
      return { ok: false, error: 'Provide at least one commander or card', status: 400 };
    }

    return { ok: true, data: { action: 'deck', commanders, cards } };
  }

  return { ok: false, error: 'Invalid action. Use "card" or "deck".', status: 400 };
}
