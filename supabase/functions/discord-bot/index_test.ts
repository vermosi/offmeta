import {
  assertEquals,
  assertStringIncludes,
  assertNotMatch,
} from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import {
  buildTrackedResultsUrl,
  cardNameToSlug,
  buildEmbed,
  condenseOracle,
  handleClickRedirect,
  signClick,
  clickPayload,
} from './index.ts';

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

Deno.test('buildTrackedResultsUrl returns a clean offmeta.app URL', async () => {
  const url = await buildTrackedResultsUrl(
    'budget board wipes in green',
    'a5eb4b84ae9e402b04349579',
    '1396995018337550346',
    undefined,
    'test-secret',
  );
  assertStringIncludes(url, 'https://offmeta.app/go?');
  assertStringIncludes(url, 'q=budget+board+wipes+in+green');
  assertStringIncludes(url, 'a=a5eb4b84ae9e402b04349579');
  assertStringIncludes(url, 'g=1396995018337550346');
  assertStringIncludes(url, 'x=');
  assertStringIncludes(url, 's=');
  assertNotMatch(url, /supabase\.co/);
});

Deno.test('handleClickRedirect returns JSON for client-side bridge', async () => {
  const query = 'budget board wipes in green';
  const actorHash = 'a5eb4b84ae9e402b04349579';
  const guildId = '1396995018337550346';
  const secret = 'test-secret';
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const signature = await signClick(
    clickPayload(query, actorHash, guildId, expiresAt),
    secret,
  );
  const functionUrl =
    `https://example.com/discord-bot?q=${encodeURIComponent(query)}` +
    `&a=${actorHash}&g=${guildId}&x=${expiresAt}&s=${signature}`;

  const req = new Request(functionUrl, {
    headers: { Accept: 'application/json' },
  });
  const res = await handleClickRedirect(req);
  const data = await res.json();
  assertEquals(res.status, 200);
  assertEquals(data.ok, true);
  assertStringIncludes(
    data.redirectUrl,
    'https://offmeta.app/?q=budget+board+wipes+in+green',
  );
  assertStringIncludes(data.redirectUrl, 'utm_source=discord');
});


Deno.test('buildEmbed includes rules text, stats and price per card', () => {
  const embed = buildEmbed(
    'cards like rhystic study',
    't:enchantment id<=U',
    [
      {
        name: 'Bident of Thassa',
        typeLine: 'Legendary Enchantment Artifact',
        manaCost: '{2}{U}{U}',
        scryfallUri: 'https://offmeta.app/cards/bident-of-thassa',
        oracleSnippet: 'Whenever a creature you control deals combat damage to a player, draw a card.',
        price: '$3.21',
        edhrecRank: 1234,
      },
    ],
    111,
  );
  const description = String(embed.description);
  assertStringIncludes(description, 'draw a card');
  assertStringIncludes(description, '$3.21');
  assertStringIncludes(description, 'EDHREC #1,234');
});

Deno.test('condenseOracle strips reminder text and clips long rules text', () => {
  assertEquals(
    condenseOracle('Flying (This creature can only be blocked by creatures with flying.)'),
    'Flying',
  );
  const long = condenseOracle('A'.repeat(400));
  assertEquals(long.length <= 181, true);
});
