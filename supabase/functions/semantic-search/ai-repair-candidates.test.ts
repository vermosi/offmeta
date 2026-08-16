import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { buildAiRepairCandidates } from './ai-repair-candidates.ts';

Deno.test('rewrites oracle-text art terms into atag queries', () => {
  const candidates = buildAiRepairCandidates(
    'shirtless cards',
    'o:"shirtless"',
  );
  const queries = candidates.map((c) => c.query);
  assertEquals(queries.includes('atag:shirtless'), true);
});

Deno.test('rewrites art: term into atag: when it is a known art tag', () => {
  const candidates = buildAiRepairCandidates(
    'cards with pizza in them',
    'art:pizza',
  );
  assertEquals(
    candidates.some((c) => c.query === 'atag:pizza'),
    true,
  );
});

Deno.test('adds a format to a bare legality token', () => {
  const candidates = buildAiRepairCandidates('banned cards', 'banned');
  assertEquals(candidates[0].query, 'banned:commander');
  assertEquals(candidates[0].reason, 'legality_format_added');
});

Deno.test('uses the format named in the original query', () => {
  const candidates = buildAiRepairCandidates(
    'banned cards in modern',
    'banned',
  );
  assertEquals(candidates[0].query, 'banned:modern');
});

Deno.test('turns stacked oracle terms into an OR of creature types', () => {
  const candidates = buildAiRepairCandidates(
    'mono red monkeyape',
    'c=r id=r t:creature o:"monkey" o:"ape"',
  );
  const rewrite = candidates.find((c) => c.reason === 'subtype_rewrite');
  assertEquals(rewrite?.query, 'c=r id=r t:creature (t:monkey or t:ape)');
});

Deno.test('resolves "cards like X" to the card name when known', () => {
  const candidates = buildAiRepairCandidates(
    'cards like hermit druid',
    't:druid t:hermit',
    { isKnownCardName: (name) => name.toLowerCase() === 'hermit druid' },
  );
  assertEquals(candidates[0].query, '!"hermit druid"');
});

Deno.test('returns nothing when the AI query needs no repair', () => {
  const candidates = buildAiRepairCandidates(
    'cheap red treasure cards',
    'c:r usd<5 otag:treasure',
  );
  assertEquals(candidates.length, 0);
});

Deno.test('never returns a candidate identical to the AI query', () => {
  const candidates = buildAiRepairCandidates('banned cards', 'banned:commander');
  assertEquals(candidates.length, 0);
});
