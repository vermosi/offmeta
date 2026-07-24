/**
 * Deterministic card role extraction for client-side aggregation.
 * Mirrors the edge-function role heuristics so the UI can summarize result
 * sets without depending on server-only file paths.
 */

const ROLE_PATTERNS: Array<{ role: string; patterns: string[] }> = [
  {
    role: 'removal',
    patterns: [
      'destroy target',
      'exile target',
      'deals damage to any target',
      'deals damage to target',
    ],
  },
  {
    role: 'board_wipe',
    patterns: [
      'destroy all',
      'exile all',
      'all creatures get -',
      'each creature gets -',
    ],
  },
  {
    role: 'counterspell',
    patterns: [
      'counter target spell',
      'counter target activated',
      'counter target triggered',
    ],
  },
  {
    role: 'draw',
    patterns: ['draw a card', 'draw two card', 'draw cards', 'draws a card'],
  },
  {
    role: 'ramp',
    patterns: [
      'search your library for a basic land',
      'search your library for a land',
      'add {',
      'add one mana',
      'adds one mana',
    ],
  },
  {
    role: 'tutor',
    patterns: ['search your library for a card', 'search your library for a'],
  },
  {
    role: 'recursion',
    patterns: [
      'return target creature card from your graveyard',
      'return from your graveyard',
      'from your graveyard to your hand',
      'from your graveyard to the battlefield',
    ],
  },
  {
    role: 'sacrifice_outlet',
    patterns: [
      'sacrifice a creature',
      'sacrifice another',
      'sacrifice a permanent',
    ],
  },
  {
    role: 'token_generator',
    patterns: ['create a', 'creature token', 'token with'],
  },
  {
    role: 'lifegain',
    patterns: ['you gain life', 'gains that much life', 'gain life equal'],
  },
  {
    role: 'protection',
    patterns: ['hexproof', 'indestructible', 'shroud', 'protection from'],
  },
  {
    role: 'discard',
    patterns: ['discard a card', 'discards a card', 'each opponent discards'],
  },
  { role: 'mill', patterns: ['mills', 'put the top', 'into their graveyard'] },
  {
    role: 'blink',
    patterns: [
      'exile target creature you control, then return',
      'exile it, then return',
      'flicker',
    ],
  },
  { role: 'pump', patterns: ['gets +', 'get +', '+1/+1 counter'] },
  {
    role: 'cost_reduction',
    patterns: [
      'costs {1} less',
      'costs {2} less',
      'cost {1} less',
      'cost less to cast',
      'without paying',
    ],
  },
  {
    role: 'copy',
    patterns: ['copy target', 'becomes a copy', "create a token that's a copy"],
  },
  {
    role: 'land_destruction',
    patterns: ['destroy target land', 'destroy target nonbasic'],
  },
  {
    role: 'equipment',
    patterns: ['equip {', 'equipped creature gets', 'attach'],
  },
  {
    role: 'evasion',
    patterns: [
      "can't be blocked",
      'unblockable',
      'menace',
      'fear',
      'intimidate',
      'shadow',
    ],
  },
];

export function extractRoles(oracleText: string | null): string[] {
  if (!oracleText) return [];
  const lower = oracleText.toLowerCase();
  const matched: string[] = [];

  for (const { role, patterns } of ROLE_PATTERNS) {
    for (const pattern of patterns) {
      if (lower.includes(pattern)) {
        matched.push(role);
        break;
      }
    }
  }

  return matched;
}
