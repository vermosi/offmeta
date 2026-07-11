import { array, coerce, integer, nullable, object, optional, string, size } from 'superstruct';

export const ImportedCardStruct = object({
  name: size(string(), 1, 200),
  quantity: coerce(integer(), string(), (value) => Number.parseInt(value, 10)),
});

export const ImportedDeckStruct = object({
  name: optional(size(string(), 1, 200)),
  format: optional(size(string(), 1, 64)),
  commander: optional(nullable(size(string(), 1, 200))),
  colorIdentity: optional(array(size(string(), 1, 1))),
  cards: array(ImportedCardStruct),
});

export type ImportedCard = {
  name: string;
  quantity: number;
};

export type ImportedDeck = {
  name?: string;
  format?: string;
  commander?: string | null;
  colorIdentity?: string[];
  cards: ImportedCard[];
};

