export const KNOWN_OTAGS = new Set([
  // ── Ramp & Mana ──
  'ramp',
  'mana-rock',
  'manarock',
  'mana-dork',
  'mana-doubler',
  'mana-sink',
  // NOTE: land-ramp is NOT a valid Scryfall otag
  'ritual',

  // ── Card Advantage ──
  'draw',
  // NOTE: card-draw is NOT a valid Scryfall otag — use 'draw' instead
  'cantrip',
  'loot',
  // NOTE: looting is NOT a valid Scryfall otag — use 'loot' instead
  'wheel',
  'impulse-draw',
  'scry',

  // ── Tutors ──
  'tutor',
  // NOTE: land-tutor, creature-tutor, artifact-tutor, enchantment-tutor,
  // instant-or-sorcery-tutor are NOT valid Scryfall otags

  // ── Removal ──
  'removal',
  'spot-removal',
  'creature-removal',
  'artifact-removal',
  'enchantment-removal',
  'planeswalker-removal',
  'board-wipe',
  'mass-removal',
  'graveyard-hate',

  // ── Graveyard ──
  // NOTE: graveyard-recursion is NOT a valid Scryfall otag — use otag:recursion or otag:reanimate
  // NOTE: reanimation is NOT a valid Scryfall otag — use otag:reanimate
  'recursion',
  'reanimate',

  // ── Tokens ──
  // NOTE: token-generator, food-generator, clue-generator, blood-generator
  // are NOT valid Scryfall otags — use o:"create" o:"[Token]" instead

  // ── Life & Combat ──
  'lifegain',
  'soul-warden-ability',
  'burn',
  'fog',
  'combat-trick',
  // NOTE: pump is NOT a valid Scryfall otag

  // ── Blink & Bounce ──
  'blink',
  'flicker',
  'bounce',
  // NOTE: mass-bounce is NOT a valid Scryfall otag

  // ── Copy & Clone ──
  'copy',
  'copy-permanent',
  'copy-spell',
  'clone',

  // ── Control & Stax ──
  // NOTE: stax is NOT a valid Scryfall otag — use o:"can't" / pillowfort
  'hatebear',
  'pillowfort',

  // ── Theft ──
  'theft',
  // NOTE: mind-control is NOT a valid Scryfall otag — use otag:theft
  'threaten',

  // ── Sacrifice ──
  'sacrifice-outlet',
  'free-sacrifice-outlet',
  // NOTE: aristocrats is NOT a valid Scryfall otag
  'death-trigger',
  // NOTE: grave-pact-effect is NOT a valid Scryfall otag
  // NOTE: blood-artist-effect is NOT a valid Scryfall otag
  'synergy-sacrifice',
  'synergy-lifegain',
  'synergy-discard',
  'synergy-equipment',
  'synergy-proliferate',

  // ── Special Effects ──
  'extra-turn',
  'extra-combat',
  'polymorph',
  'egg',
  'activate-from-graveyard',
  'cast-from-graveyard',

  // ── Tap/Untap ──
  'untapper',
  'tapper',

  // ── Ability Granting ──
  'gives-flash',
  'gives-hexproof',
  'gives-haste',
  'gives-flying',
  'gives-trample',
  'gives-vigilance',
  'gives-deathtouch',
  'gives-lifelink',
  'gives-first-strike',
  'gives-double-strike',
  'gives-menace',
  'gives-reach',
  'gives-protection',
  'gives-indestructible',
  // NOTE: gives-evasion is NOT a valid Scryfall otag — use otag:evasion

  // ── Lands & Enchantress ──
  'landfall',
  'extra-land',
  'enchantress',

  // ── Graveyard Misc ──
  'discard-outlet',
  'mulch',
  'lord',
  'anthem',
  'self-mill',
  // NOTE: mill is NOT a valid Scryfall otag — use o:"mill" instead
  'graveyard-order-matters',
  // NOTE: shares-name-with-set is NOT a valid Scryfall otag

  // ── Special/Meta Tags ──
  'win-condition',
  'counters-matter',
  'counter-doubler',
  'counter-movement',
  // NOTE: etb-trigger, ltb-trigger are NOT valid Scryfall otags
  'cost-reducer',
  // NOTE: token-doubler is NOT a valid Scryfall otag
  // NOTE: populate is NOT a valid Scryfall otag — use kw:populate
  'overrun',
  // NOTE: hard-counter, soft-counter are NOT valid Scryfall otags — use otag:counter
  'counter',
  // NOTE: creature-board-wipe is NOT a valid Scryfall otag — use otag:board-wipe
  'pinger',
  // NOTE: ping is NOT a valid Scryfall otag — use otag:pinger
  // NOTE: drain is NOT a valid Scryfall otag
  // NOTE: tax-effect is NOT a valid Scryfall otag
  'evasion',
  'rummage',
  // NOTE: rummaging is NOT a valid Scryfall otag — use otag:rummage

  // ── Verified from scryfall-otag-validation.test.ts ──
  'activated-ability',
  'affinity',
  'alternate-win-condition',
  'balance',
  'banish',
  'battalion',
  'bite',
  'boardwipe',
  'bribery',
  'bushido',
  'naturalize',
  'pacifism',
  'persist',
  'plunder',
  'pseudo-haste',
  'punisher',
  'regrowth',
  'removal-artifact',
  'removal-creature',
  'removal-enchantment',
  'removal-land',
  'removal-planeswalker',
  'revolt',
  'scry',
  'surveil',
  'painland',
  'bounceland',
  'boltland',
  'attack-trigger',
]);
