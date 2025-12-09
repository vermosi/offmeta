// Collection tracker using localStorage
const COLLECTION_STORAGE_KEY = "mtg_collection";

export interface CollectionEntry {
  cardId: string;
  cardName: string;
  quantity: number;
  foilQuantity: number;
  addedAt: string;
}

export interface Collection {
  cards: Record<string, CollectionEntry>;
}

function getCollection(): Collection {
  try {
    const stored = localStorage.getItem(COLLECTION_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load collection:", error);
  }
  return { cards: {} };
}

function saveCollection(collection: Collection): void {
  try {
    localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(collection));
  } catch (error) {
    console.error("Failed to save collection:", error);
  }
}

export function addToCollection(
  cardId: string,
  cardName: string,
  quantity: number = 1,
  isFoil: boolean = false
): CollectionEntry {
  const collection = getCollection();
  const existing = collection.cards[cardId];

  if (existing) {
    if (isFoil) {
      existing.foilQuantity += quantity;
    } else {
      existing.quantity += quantity;
    }
    collection.cards[cardId] = existing;
  } else {
    collection.cards[cardId] = {
      cardId,
      cardName,
      quantity: isFoil ? 0 : quantity,
      foilQuantity: isFoil ? quantity : 0,
      addedAt: new Date().toISOString(),
    };
  }

  saveCollection(collection);
  return collection.cards[cardId];
}

export function removeFromCollection(
  cardId: string,
  quantity: number = 1,
  isFoil: boolean = false
): CollectionEntry | null {
  const collection = getCollection();
  const existing = collection.cards[cardId];

  if (!existing) return null;

  if (isFoil) {
    existing.foilQuantity = Math.max(0, existing.foilQuantity - quantity);
  } else {
    existing.quantity = Math.max(0, existing.quantity - quantity);
  }

  if (existing.quantity === 0 && existing.foilQuantity === 0) {
    delete collection.cards[cardId];
    saveCollection(collection);
    return null;
  }

  collection.cards[cardId] = existing;
  saveCollection(collection);
  return existing;
}

export function getCollectionEntry(cardId: string): CollectionEntry | null {
  const collection = getCollection();
  return collection.cards[cardId] || null;
}

export function isInCollection(cardId: string): boolean {
  const entry = getCollectionEntry(cardId);
  return entry !== null && (entry.quantity > 0 || entry.foilQuantity > 0);
}

export function getCollectionQuantity(cardId: string): { regular: number; foil: number } {
  const entry = getCollectionEntry(cardId);
  if (!entry) return { regular: 0, foil: 0 };
  return { regular: entry.quantity, foil: entry.foilQuantity };
}

export function getAllCollectionEntries(): CollectionEntry[] {
  const collection = getCollection();
  return Object.values(collection.cards);
}

export function getCollectionStats(): {
  totalCards: number;
  uniqueCards: number;
  totalFoils: number;
} {
  const collection = getCollection();
  const entries = Object.values(collection.cards);
  
  return {
    totalCards: entries.reduce((sum, e) => sum + e.quantity + e.foilQuantity, 0),
    uniqueCards: entries.length,
    totalFoils: entries.reduce((sum, e) => sum + e.foilQuantity, 0),
  };
}

export function clearCollection(): void {
  localStorage.removeItem(COLLECTION_STORAGE_KEY);
}
