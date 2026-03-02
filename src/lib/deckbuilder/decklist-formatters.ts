/**
 * Deck export format builders — shared between DeckExportMenu and any future exporters.
 * Kept in a separate file so react-refresh can hot-reload DeckExportMenu (component-only file).
 * @module lib/deckbuilder/decklist-formatters
 */

import type { DeckCard, Deck } from '@/hooks/useDeck';

export function buildDecklistText(deck: Deck, cards: DeckCard[]): string {
  const lines: string[] = [];

  const commanders = cards.filter((c) => c.is_commander);
  if (commanders.length > 0) {
    for (const cmd of commanders) lines.push(`COMMANDER: ${cmd.card_name}`);
    lines.push('');
  }

  const companions = cards.filter((c) => c.is_companion);
  if (companions.length > 0) {
    for (const cmp of companions) lines.push(`COMPANION: ${cmp.card_name}`);
    lines.push('');
  }

  const mainboard = cards.filter(
    (c) => !c.is_commander && !c.is_companion && c.board !== 'sideboard' && c.board !== 'maybeboard',
  );
  const grouped: Record<string, DeckCard[]> = {};
  for (const card of mainboard) {
    const cat = card.category || 'Other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(card);
  }

  for (const [category, catCards] of Object.entries(grouped)) {
    lines.push(`// ${category}`);
    for (const card of catCards.sort((a, b) => a.card_name.localeCompare(b.card_name))) {
      lines.push(`${card.quantity} ${card.card_name}`);
    }
    lines.push('');
  }

  const sideboard = cards.filter((c) => c.board === 'sideboard');
  if (sideboard.length > 0) {
    lines.push('// Sideboard');
    for (const card of sideboard.sort((a, b) => a.card_name.localeCompare(b.card_name))) {
      lines.push(`${card.quantity} ${card.card_name}`);
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}

export function buildArenaText(cards: DeckCard[]): string {
  const lines: string[] = [];

  const commanders = cards.filter((c) => c.is_commander);
  const companions = cards.filter((c) => c.is_companion);
  const mainboard = cards.filter(
    (c) => !c.is_commander && !c.is_companion && c.board !== 'sideboard' && c.board !== 'maybeboard',
  );
  const sideboard = cards.filter((c) => c.board === 'sideboard');

  if (commanders.length > 0) {
    lines.push('Commander');
    for (const c of commanders) lines.push(`${c.quantity} ${c.card_name}`);
    lines.push('');
  }

  if (companions.length > 0) {
    lines.push('Companion');
    for (const c of companions) lines.push(`${c.quantity} ${c.card_name}`);
    lines.push('');
  }

  if (mainboard.length > 0) {
    lines.push('Deck');
    for (const c of mainboard.sort((a, b) => a.card_name.localeCompare(b.card_name))) {
      lines.push(`${c.quantity} ${c.card_name}`);
    }
  }

  if (sideboard.length > 0) {
    lines.push('');
    lines.push('Sideboard');
    for (const c of sideboard.sort((a, b) => a.card_name.localeCompare(b.card_name))) {
      lines.push(`${c.quantity} ${c.card_name}`);
    }
  }

  return lines.join('\n').trim();
}

export function buildMtgoText(cards: DeckCard[]): string {
  const lines: string[] = [];

  const commanders = cards.filter((c) => c.is_commander);
  const companions = cards.filter((c) => c.is_companion);
  const mainboard = cards.filter(
    (c) => !c.is_commander && !c.is_companion && c.board !== 'sideboard' && c.board !== 'maybeboard',
  );
  const sideboard = cards.filter((c) => c.board === 'sideboard');
  const allMain = [...commanders, ...mainboard];

  if (companions.length > 0) {
    for (const c of companions) lines.push(`1 ${c.card_name}`);
    lines.push('');
  }

  for (const c of allMain.sort((a, b) => a.card_name.localeCompare(b.card_name))) {
    lines.push(`${c.quantity} ${c.card_name}`);
  }

  if (sideboard.length > 0) {
    lines.push('');
    lines.push('SB:');
    for (const c of sideboard.sort((a, b) => a.card_name.localeCompare(b.card_name))) {
      lines.push(`SB: ${c.quantity} ${c.card_name}`);
    }
  }

  return lines.join('\n').trim();
}
