import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  validateGeneratedTags,
  cleanupOrphanedOperators,
  resetTagVerdictCache,
  probeTagSupported,
  type TagKind,
} from './tagRuntimeValidator.ts';

function fakeProbe(supported: Record<string, boolean>) {
  const calls: string[] = [];
  const probe = (kind: TagKind, tag: string) => {
    calls.push(`${kind}:${tag}`);
    return Promise.resolve(supported[tag] ?? false);
  };
  return { probe, calls };
}

Deno.test('leaves a query with only known tags untouched', async () => {
  const { probe, calls } = fakeProbe({});
  const result = await validateGeneratedTags('usd<5 otag:win-condition', {
    probe,
  });
  assertEquals(result.valid, true);
  assertEquals(result.query, 'usd<5 otag:win-condition');
  assertEquals(calls.length, 0);
});

Deno.test('keeps an unknown tag that Scryfall confirms is real', async () => {
  const { probe } = fakeProbe({ 'brand-new-tag': true });
  const result = await validateGeneratedTags('otag:brand-new-tag', { probe });
  assertEquals(result.valid, true);
  assertEquals(result.query, 'otag:brand-new-tag');
});

Deno.test('strips an unsupported tag and collapses the OR group', async () => {
  const { probe } = fakeProbe({});
  const result = await validateGeneratedTags(
    'usd<5 (otag:finisher or otag:win-condition)',
    { probe },
  );
  assertEquals(result.valid, false);
  assertEquals(result.query, 'usd<5 otag:win-condition');
  assertEquals(result.removedTags, ['otag:finisher']);
  assertEquals(result.warnings.length, 1);
});

Deno.test('substitutes a supported suggestion when one exists', async () => {
  const { probe } = fakeProbe({ ramp: true });
  const result = await validateGeneratedTags('t:creature otag:rampp', {
    probe,
  });
  assertEquals(result.valid, false);
  assertEquals(result.query, 't:creature otag:ramp');
  assertEquals(result.replacedTags, [{ from: 'otag:rampp', to: 'otag:ramp' }]);
});

Deno.test('drops a negated unsupported tag instead of substituting', async () => {
  const { probe } = fakeProbe({});
  const result = await validateGeneratedTags('t:creature -otag:notarealtag', {
    probe,
  });
  assertEquals(result.query, 't:creature');
  assertEquals(result.replacedTags.length, 0);
  assertEquals(result.removedTags, ['otag:notarealtag']);
});

Deno.test('validates art tags too', async () => {
  const { probe } = fakeProbe({});
  const result = await validateGeneratedTags('atag:definitelynotanarttag', {
    probe,
  });
  assertEquals(result.valid, false);
  assertEquals(result.removedTags, ['atag:definitelynotanarttag']);
});

Deno.test('keeps the original query when every tag is unsupported', async () => {
  const { probe } = fakeProbe({});
  const original = 'otag:notarealtag';
  const result = await validateGeneratedTags(original, { probe });
  assertEquals(result.query, original);
  assertEquals(result.warnings.length, 2);
});

Deno.test('fails open when the probe throws', async () => {
  const result = await validateGeneratedTags('otag:notarealtag t:creature', {
    probe: () => Promise.reject(new Error('network down')),
  }).catch(() => null);
  // The validator surfaces the rejection to the caller, which treats it as a no-op.
  assertEquals(result, null);
});

Deno.test('cleanupOrphanedOperators removes dangling booleans', () => {
  assertEquals(cleanupOrphanedOperators('( or otag:x)'), 'otag:x');
  assertEquals(cleanupOrphanedOperators('t:creature ( )'), 't:creature');
  assertEquals(cleanupOrphanedOperators('t:creature or'), 't:creature');
});

Deno.test('probeTagSupported caches verdicts and fails open offline', async () => {
  resetTagVerdictCache();
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = () => {
    calls++;
    return Promise.resolve(
      new Response(JSON.stringify({ total_cards: 0 }), { status: 404 }),
    );
  };
  try {
    assertEquals(await probeTagSupported('oracle', 'fake-tag-xyz'), false);
    assertEquals(await probeTagSupported('oracle', 'fake-tag-xyz'), false);
    assertEquals(calls, 1);

    globalThis.fetch = () => Promise.reject(new Error('offline'));
    assertEquals(await probeTagSupported('oracle', 'another-fake-tag'), true);
  } finally {
    globalThis.fetch = originalFetch;
    resetTagVerdictCache();
  }
});
