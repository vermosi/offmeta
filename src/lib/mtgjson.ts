export interface MtgjsonIdentifiers {
  scryfallId?: string;
  scryfallOracleId?: string;
  multiverseId?: string;
  mtgoId?: string;
  mtgoFoilId?: string;
  mtgjsonV4Id?: string;
  tcgplayerProductId?: string;
  cardKingdomId?: string;
  cardmarketId?: string;
}

export interface MtgjsonPurchaseUrls {
  tcgplayer?: string;
  cardmarket?: string;
  cardKingdom?: string;
  cardKingdomFoil?: string;
}

export interface MtgjsonRelatedCards {
  reverseRelated?: string[];
  spellbook?: string[];
  tokens?: string[];
}

export interface MtgjsonSetCard {
  uuid: string;
  scryfallId?: string;
  identifiers?: MtgjsonIdentifiers;
  name: string;
  setCode: string;
  setName: string;
  collectorNumber: string;
  rarity?: string;
  artist?: string;
  prices?: {
    usd?: string;
    usdFoil?: string;
    eur?: string;
    eurFoil?: string;
    tix?: string;
  };
  purchaseUrls?: MtgjsonPurchaseUrls;
  relatedCards?: MtgjsonRelatedCards | null;
  releasedAt?: string;
  language?: string;
}

export interface MtgjsonSetData {
  code: string;
  name: string;
  cards?: MtgjsonSetCard[];
}

export interface MtgjsonPrintingRow {
  id: string;
  scryfall_id: string | null;
  mtgjson_uuid: string;
  oracle_id: string;
  name: string;
  set: string;
  set_name: string;
  collector_number: string;
  rarity: string | null;
  artist: string | null;
  prices: {
    usd?: string;
    usd_foil?: string;
    eur?: string;
    eur_foil?: string;
    tix?: string;
  } | null;
  image_url: string | null;
  purchase_uris: {
    tcgplayer?: string;
    cardmarket?: string;
    cardhoarder?: string;
    cardKingdom?: string;
    cardKingdomFoil?: string;
  } | null;
  identifiers: Record<string, unknown> | null;
  related_cards: Record<string, unknown> | null;
  released_at: string | null;
  lang: string;
  updated_at: string;
}

export function mapMtgjsonCardToPrintingRow(
  set: MtgjsonSetData,
  card: MtgjsonSetCard,
): MtgjsonPrintingRow | null {
  const oracleId =
    card.identifiers?.scryfallOracleId ??
    card.identifiers?.mtgjsonV4Id ??
    card.identifiers?.scryfallId ??
    card.uuid;

  if (!oracleId) return null;

  return {
    id: card.uuid,
    scryfall_id: card.identifiers?.scryfallId ?? card.scryfallId ?? null,
    mtgjson_uuid: card.uuid,
    oracle_id: oracleId,
    name: card.name,
    set: set.code,
    set_name: set.name,
    collector_number: card.collectorNumber,
    rarity: card.rarity ?? null,
    artist: card.artist ?? null,
    prices: card.prices
      ? {
          usd: card.prices.usd,
          usd_foil: card.prices.usdFoil,
          eur: card.prices.eur,
          eur_foil: card.prices.eurFoil,
          tix: card.prices.tix,
        }
      : null,
    image_url: null,
    purchase_uris: card.purchaseUrls
      ? {
          tcgplayer: card.purchaseUrls.tcgplayer,
          cardmarket: card.purchaseUrls.cardmarket,
          cardKingdom: card.purchaseUrls.cardKingdom,
          cardKingdomFoil: card.purchaseUrls.cardKingdomFoil,
        }
      : null,
    identifiers: card.identifiers ? { ...card.identifiers } : null,
    related_cards: card.relatedCards ? { ...card.relatedCards } : null,
    released_at: card.releasedAt ?? null,
    lang: card.language ?? 'en',
    updated_at: new Date().toISOString(),
  };
}

