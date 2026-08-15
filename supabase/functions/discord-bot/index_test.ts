import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { cardNameToSlug } from './index.ts';

Deno.test('cardNameToSlug converts card names to canonical OffMeta slugs', () => {
  assertEquals(cardNameToSlug('Sol Ring'), 'sol-ring');
  assertEquals(cardNameToSlug('Rhystic Study'), 'rhystic-study');
  assertEquals(cardNameToSlug('Ökun, Ruin Sage'), 'okun-ruin-sage');
  assertEquals(cardNameToSlug('Séance'), 'seance');
  assertEquals(cardNameToSlug("Urza's Saga"), 'urzas-saga');
  assertEquals(cardNameToSlug('Acererak the Archlich'), 'acererak-the-archlich');
});

Deno.test('cardNameToSlug handles empty and special input gracefully', () => {
  assertEquals(cardNameToSlug(''), '');
  assertEquals(cardNameToSlug('!!!'), '');
  assertEquals(cardNameToSlug('  Double   Spaces  '), 'double-spaces');
});
