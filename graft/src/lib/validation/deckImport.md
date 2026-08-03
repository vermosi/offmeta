# src\lib\validation\deckImport.ts

- ImportedCard · type · L16-L19 — type ImportedCard = { name: string; quantity: number; };
- ImportedDeck · type · L21-L27 — type ImportedDeck = { name?: string; format?: string; commander?: string | null; colorIdentity?: string[]; cards: ImportedCard[]; };
