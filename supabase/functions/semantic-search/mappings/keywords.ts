/**
 * Keyword ability mappings for Scryfall's kw: operator.
 * This is more accurate than searching oracle text for keyword names.
 * @module mappings/keywords
 */

/**
 * Standard keyword abilities that use Scryfall's kw: operator
 */
export const KEYWORD_MAP: Record<string, string> = {
  haste: 'kw:haste',
  flying: 'kw:flying',
  trample: 'kw:trample',
  deathtouch: 'kw:deathtouch',
  lifelink: 'kw:lifelink',
  vigilance: 'kw:vigilance',
  menace: 'kw:menace',
  reach: 'kw:reach',
  'first strike': 'kw:first-strike',
  'double strike': 'kw:double-strike',
  hexproof: 'kw:hexproof',
  indestructible: 'kw:indestructible',
  flash: 'kw:flash',
  defender: 'kw:defender',
  infect: 'kw:infect',
  flashback: 'kw:flashback',
  buyback: 'kw:buyback',
  kicker: 'kw:kicker',
  prowess: 'kw:prowess',
  ward: 'kw:ward',
  shroud: 'kw:shroud',
  fear: 'kw:fear',
  intimidate: 'kw:intimidate',
  skulk: 'kw:skulk',
  shadow: 'kw:shadow',
  horsemanship: 'kw:horsemanship',
  protection: 'kw:protection',
  absorb: 'kw:absorb',
  cascade: 'kw:cascade',
  convoke: 'kw:convoke',
  delve: 'kw:delve',
  dredge: 'kw:dredge',
  emerge: 'kw:emerge',
  evoke: 'kw:evoke',
  exploit: 'kw:exploit',
  extort: 'kw:extort',
  living: 'kw:living-weapon',
  madness: 'kw:madness',
  miracle: 'kw:miracle',
  modular: 'kw:modular',
  morph: 'kw:morph',
  mutate: 'kw:mutate',
  ninjutsu: 'kw:ninjutsu',
  outlast: 'kw:outlast',
  persist: 'kw:persist',
  phasing: 'kw:phasing',
  rampage: 'kw:rampage',
  rebound: 'kw:rebound',
  regenerate: 'kw:regenerate',
  replicate: 'kw:replicate',
  retrace: 'kw:retrace',
  scavenge: 'kw:scavenge',
  storm: 'kw:storm',
  sunburst: 'kw:sunburst',
  suspend: 'kw:suspend',
  totem: 'kw:totem-armor',
  transfigure: 'kw:transfigure',
  transmute: 'kw:transmute',
  undying: 'kw:undying',
  unearth: 'kw:unearth',
  wither: 'kw:wither',
  // Keywords that need oracle text search (Issue #3: "red goad" lost intent)
  goad: 'o:goad',
  goading: 'o:goad',
  provoke: 'kw:provoke',
  myriad: 'kw:myriad',
  encore: 'kw:encore',
  blitz: 'kw:blitz',
  connive: 'kw:connive',
  offspring: 'kw:offspring',
  backup: 'kw:backup',
};

/**
 * Special keyword mappings that don't use kw: operator
 */
export const SPECIAL_KEYWORD_MAP: Record<string, string> = {
  unblockable: 'o:"can\'t be blocked"',
  evasion:
    '(kw:flying or kw:menace or kw:skulk or kw:shadow or kw:fear or kw:intimidate or kw:horsemanship)',
  affinity: 'o:"affinity for"',
  annihilator: 'o:"annihilator"',
};

/**
 * Keywords that can be granted to other cards (for "X enablers" pattern)
 */
export const ENABLER_KEYWORDS = [
  'haste',
  'flying',
  'trample',
  'deathtouch',
  'lifelink',
  'menace',
  'hexproof',
  'indestructible',
  'vigilance',
  'first-strike',
  'double-strike',
  'reach',
  'protection',
];
