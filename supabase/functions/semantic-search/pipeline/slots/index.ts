/**
 * Slot Extraction – Orchestrator
 * Extracts structured constraints from a normalized query.
 * @module pipeline/slots
 */

import type { ExtractedSlots } from '../types.ts';
import { extractFormat } from './extract-format.ts';
import { extractColors } from './extract-colors.ts';
import { extractTypes, extractSubtypes } from './extract-types.ts';
import { extractNumericConstraint, extractYearConstraint, extractPriceConstraint } from './extract-numeric.ts';
import { extractRarity, extractNegations } from './extract-rarity.ts';

export function extractSlots(normalizedQuery: string): ExtractedSlots {
  let remaining = normalizedQuery;

  const slots: ExtractedSlots = {
    format: null,
    colors: null,
    types: { include: [], includeOr: [], exclude: [] },
    subtypes: [],
    mv: null,
    power: null,
    toughness: null,
    year: null,
    price: null,
    rarity: null,
    includeText: [],
    excludeText: [],
    tags: [],
    specials: [],
    residual: '',
  };

  // Extract format
  const formatResult = extractFormat(remaining);
  slots.format = formatResult.format;
  remaining = formatResult.remaining;

  // Extract colors
  const colorResult = extractColors(remaining);
  slots.colors = colorResult.colors;
  remaining = colorResult.remaining;

  // Extract types
  const typeResult = extractTypes(remaining);
  slots.types = typeResult.types;
  remaining = typeResult.remaining;

  // Extract subtypes
  const subtypeResult = extractSubtypes(remaining);
  slots.subtypes = subtypeResult.subtypes;
  remaining = subtypeResult.remaining;

  // Extract numeric constraints
  const mvResult = extractNumericConstraint(remaining, [
    'mana value', 'mana', 'mv', 'cost', 'costs',
  ]);
  slots.mv = mvResult.constraint;
  remaining = mvResult.remaining;

  const powerResult = extractNumericConstraint(remaining, ['power', 'pow']);
  slots.power = powerResult.constraint;
  remaining = powerResult.remaining;

  const toughResult = extractNumericConstraint(remaining, ['toughness', 'tou']);
  slots.toughness = toughResult.constraint;
  remaining = toughResult.remaining;

  // Extract year constraints
  const yearResult = extractYearConstraint(remaining);
  slots.year = yearResult.constraint;
  remaining = yearResult.remaining;

  // Extract price constraints
  const priceResult = extractPriceConstraint(remaining);
  slots.price = priceResult.constraint;
  remaining = priceResult.remaining;

  // Extract rarity
  const rarityResult = extractRarity(remaining);
  slots.rarity = rarityResult.rarity;
  remaining = rarityResult.remaining;

  // Extract negations
  const negationResult = extractNegations(remaining);
  slots.types.exclude = negationResult.excludedTypes;
  slots.excludeText = negationResult.excludedText;
  remaining = negationResult.remaining;

  // Clean up residual
  slots.residual = remaining
    .replace(/\s+/g, ' ')
    .replace(/\b(that|which|with|the|a|an|cards?|is|are|for|in|my)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return slots;
}
