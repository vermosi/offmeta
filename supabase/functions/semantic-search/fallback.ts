import { buildDeterministicIntent } from './deterministic/index.ts';
import { validateQuery } from './validation.ts';

/**
 * Filler words that carry no Scryfall meaning. Left bare in a query they act
 * as an implicit card-name match and produce nonsense results.
 */
const BARE_WORD_STOPWORDS = new Set([
  'a',
  'about',
  'all',
  'an',
  'and',
  'any',
  'are',
  'art',
  'as',
  'at',
  'be',
  'best',
  'but',
  'by',
  'can',
  'card',
  'cards',
  'depicted',
  'do',
  'does',
  'each',
  'example',
  'find',
  'for',
  'from',
  'give',
  'gives',
  'good',
  'has',
  'have',
  'how',
  'i',
  'if',
  'in',
  'is',
  'it',
  'its',
  'kind',
  'like',
  'looking',
  'make',
  'makes',
  'me',
  'more',
  'most',
  'my',
  'need',
  'of',
  'on',
  'or',
  'otag',
  'our',
  'out',
  'show',
  'some',
  'something',
  'sort',
  'tag',
  'that',
  'the',
  'their',
  'them',
  'then',
  'there',
  'these',
  'they',
  'thing',
  'things',
  'this',
  'those',
  'to',
  'up',
  'use',
  'used',
  'want',
  'was',
  'what',
  'when',
  'which',
  'who',
  'will',
  'with',
  'would',
  'you',
  'your',
  // Prose observed in low-confidence logs that produced dead oracle terms
  'affect',
  'affects',
  'archetype',
  'archetypes',
  'big',
  'brings',
  'build',
  'color',
  'colors',
  'colour',
  'colours',
  'creator',
  'deck',
  'decks',
  'effect',
  'effects',
  'help',
  'huge',
  'kinds',
  'large',
  'mechanic',
  'mechanics',
  'own',
  'please',
  'puts',
  'similar',
  'small',
  'style',
  'support',
  'supports',
  'theme',
  'type',
  'types',
]);

/**
 * Common function words from the other supported locales. A fallback query is
 * always executed against English oracle text, so leaking these into `o:"..."`
 * guarantees zero results.
 */
const NON_ENGLISH_STOPWORDS = new Set([
  // es / pt
  'al', 'como', 'con', 'cartas', 'carta', 'criaturas', 'criatura', 'de', 'del',
  'efeito', 'el', 'em', 'en', 'las', 'los', 'mejores', 'melhores', 'nas', 'nos',
  'para', 'por', 'que', 'sobre', 'una', 'uno', 'com', 'dos', 'das',
  // fr
  'avec', 'cartes', 'des', 'dans', 'les', 'meilleures', 'pour', 'qui', 'sur',
  // de
  'die', 'der', 'das', 'karten', 'mit', 'und', 'besten', 'für',
  // it
  'carte', 'con', 'migliori', 'per', 'che',
]);

/** Maximum number of leftover words promoted to oracle-text constraints. */
const MAX_BARE_WORD_TERMS = 3;


/**
 * Converts leftover natural-language words into explicit oracle-text terms so
 * a fallback query never leaks raw prose into Scryfall (where bare words are
 * treated as a card-name match).
 */
export function wrapBareWords(segment: string): string {
  const parts = segment.split(/\s+/).filter(Boolean);
  const output: string[] = [];
  let oracleTerms = 0;

  for (const part of parts) {
    // Preserve anything that is already Scryfall syntax or grouping.
    if (/[:=<>()"/]/.test(part) || /^-/.test(part)) {
      output.push(part);
      continue;
    }
    const word = part.replace(/[^a-z0-9'-]/gi, '').toLowerCase();
    // Boolean operators are query structure, not prose.
    if (word === 'or' || word === 'and' || word === 'not') {
      output.push(word);
      continue;
    }
    if (!word || word.length < 3 || BARE_WORD_STOPWORDS.has(word)) continue;
    if (oracleTerms >= MAX_BARE_WORD_TERMS) continue;
    output.push(`o:"${word}"`);
    oracleTerms += 1;
  }

  // Drop dangling/duplicated boolean operators left behind by removed prose.
  const isOperator = (value: string) =>
    value === 'or' || value === 'and' || value === 'not';
  const cleaned: string[] = [];
  for (const token of output) {
    if (isOperator(token)) {
      const previous = cleaned[cleaned.length - 1];
      if (!previous || isOperator(previous) || previous.endsWith('(')) continue;
    }
    cleaned.push(token);
  }
  while (cleaned.length > 0 && isOperator(cleaned[cleaned.length - 1])) {
    cleaned.pop();
  }

  return cleaned.join(' ').trim();
}

/**
 * Builds a fallback Scryfall query using deterministic rules and basic
 * transformations. Used when AI translation remains unavailable or fails.
 */
export function buildFallbackQuery(
  query: string,
  filters?: { format?: string; colorIdentity?: string[] } | null,
): { sanitized: string; issues: string[] } {
  const { intent, deterministicQuery } = buildDeterministicIntent(query);
  let fallbackQuery = deterministicQuery;
  let remainingQuery = intent.remainingQuery || '';

  // Apply comprehensive keyword transformations
  const basicTransforms: [RegExp, string][] = [
    // Core MTG slang
    [/\betb\b/gi, 'o:"enters"'],
    [/\bltb\b/gi, 'o:"leaves"'],
    [/\bdies\b/gi, 'o:"dies"'],

    // Year/date handling
    [/\bafter (\d{4})\b/gi, 'year>$1'],
    [/\breleased after (\d{4})\b/gi, 'year>$1'],
    [/\bsince (\d{4})\b/gi, 'year>=$1'],
    [/\bbefore (\d{4})\b/gi, 'year<$1'],
    [/\bin (\d{4})\b/gi, 'year=$1'],
    [/\bfrom (\d{4})\b/gi, 'year=$1'],

    // Mono-color handling
    [/\bmono[ -]?red\b/gi, 'c=r'],
    [/\bmono[ -]?blue\b/gi, 'c=u'],
    [/\bmono[ -]?green\b/gi, 'c=g'],
    [/\bmono[ -]?white\b/gi, 'c=w'],
    [/\bmono[ -]?black\b/gi, 'c=b'],
    [/\bcolorless\b/gi, 'c=c'],

    // Flash granting
    [/\bgive(?:s)? (?:spells? )?flash\b/gi, 'otag:gives-flash'],
    [/\bflash enablers?\b/gi, 'otag:gives-flash'],
    [/\blet(?:s)? me cast.+instant speed\b/gi, 'otag:gives-flash'],

    // Sol Ring alternatives
    [/\bsol ring alternatives?\b/gi, 't:artifact o:"{C}{C}" o:"add"'],
    [
      /\bartifacts? that add(?:s)? \{?c\}?\{?c\}?\b/gi,
      't:artifact o:"{C}{C}" o:"add"',
    ],
    [/\badds? (?:2|two) colorless\b/gi, 'o:"{C}{C}" o:"add"'],
    [/\badds? \{c\}\{c\}\b/gi, 'o:"{C}{C}" o:"add"'],
    [
      /\bartifacts? that add(?:s)? (?:2|two) mana\b/gi,
      't:artifact o:/add \\{.\\}\\{.\\}/',
    ],
    [
      /\bcards? that add(?:s)? (?:2|two|multiple) mana\b/gi,
      'o:/add \\{.\\}\\{.\\}/',
    ],

    // Untap vs untapped
    [/\bcards? that untap (\w+)\b/gi, 'otag:untapper o:"untap" o:"$1"'],
    [/\bcards? that untap\b/gi, 'otag:untapper'],
    [/\buntap artifacts?\b/gi, 'otag:untapper t:artifact'],
    [/\buntap creatures?\b/gi, 'otag:untapper o:"creature"'],
    [/\buntap lands?\b/gi, 'o:"untap" o:"land" -o:"untapped"'],
    [/\buntappers?\b/gi, 'otag:untapper'],

    // Modal/MDFC lands
    [/\bmodal lands?\b/gi, 'is:mdfc t:land'],
    [/\bmdfc lands?\b/gi, 'is:mdfc t:land'],
    [/\bmodal cards? that are lands?\b/gi, 'is:mdfc t:land'],
    [/\bmodal spells?\b/gi, 'is:modal'],
    [/\bpathway lands?\b/gi, 'is:pathway'],

    // Strategy hate / hosers
    [
      /\b(?:cards? that )?(?:punish(?:es|ing)?|hate|hates|stop|stops|shut(?:s|ting)?\s+down|beat[s]?|counter[s]?|anti[- ]?)\s+(?:the\s+)?(?:ramp|land[- ]?ramp|lands|mana)\b/gi,
      '(o:"can\'t search" or o:"can\'t play additional lands" or (o:"skip" o:"land") or otag:hatebear)',
    ],
    [
      /\b(?:cards? that )?(?:punish(?:es|ing)?|hate|hates|stop|stops|shut(?:s|ting)?\s+down|beat[s]?|counter[s]?|anti[- ]?)\s+(?:the\s+)?(?:storm|spellslinger|spells?|instants?\s+and\s+sorceries?|combo)\b/gi,
      '(o:"can\'t cast more than" or (o:"whenever" o:"opponent" o:"casts") or otag:hatebear or (o:"spells cost" o:"more"))',
    ],
    [
      /\b(?:cards? that )?(?:punish(?:es|ing)?|hate|hates|stop|stops|shut(?:s|ting)?\s+down|beat[s]?|counter[s]?|anti[- ]?)\s+(?:the\s+)?tokens?\b/gi,
      '(o:"tokens can\'t" or o:"exile all tokens" or o:"destroy all tokens")',
    ],
    [
      /\b(?:cards? that )?(?:punish(?:es|ing)?|hate|hates|stop|stops|shut(?:s|ting)?\s+down|beat[s]?|counter[s]?|anti[- ]?)\s+(?:the\s+)?(?:life\s?gain|life)\b/gi,
      '(o:"can\'t gain life" or o:"lose life instead" or (o:"whenever" o:"gains life"))',
    ],
    [
      /\b(?:cards? that )?(?:punish(?:es|ing)?|hate|hates|stop|stops|shut(?:s|ting)?\s+down|beat[s]?|counter[s]?|anti[- ]?)\s+(?:the\s+)?(?:tutors?|search)\b/gi,
      '(o:"can\'t search" or otag:hatebear)',
    ],
    [
      /\b(?:cards? that )?(?:punish(?:es|ing)?|hate|hates|stop|stops|shut(?:s|ting)?\s+down|beat[s]?|counter[s]?|anti[- ]?)\s+(?:the\s+)?(?:draw|card[- ]?draw|wheel|blue)\b/gi,
      '((o:"whenever" o:"opponent" o:"draws") or (o:"skip" o:"draw") or o:"can\'t draw more than" or otag:hatebear)',
    ],
    [
      /\b(?:cards? that )?(?:punish(?:es|ing)?|hate|hates|stop|stops|shut(?:s|ting)?\s+down|beat[s]?|counter[s]?|anti[- ]?)\s+(?:the\s+)?(?:aggro|creature|go[- ]?wide|weenie|swarm)\b/gi,
      '(otag:boardwipe or o:"deals damage to each creature")',
    ],
    [
      /\b(?:cards? that )?(?:punish(?:es|ing)?|hate|hates|stop|stops|shut(?:s|ting)?\s+down|beat[s]?|counter[s]?|anti[- ]?)\s+(?:the\s+)?enchantments?\b/gi,
      '(o:"destroy" o:"enchantment" or o:"exile" o:"enchantment")',
    ],
    [
      /\b(?:cards? that )?(?:punish(?:es|ing)?|hate|hates|stop|stops|shut(?:s|ting)?\s+down|beat[s]?|counter[s]?|anti[- ]?)\s+(?:the\s+)?(?:control|counterspell|counter\s?magic|permission)\b/gi,
      '(o:"can\'t be countered" or (o:"whenever" o:"opponent" o:"counters") or otag:hatebear)',
    ],

    // Ramp and mana
    [/\bramp\b/gi, 'otag:ramp'],
    [/\bmana ?rocks?\b/gi, 'otag:mana-rock'],
    [/\bmanarocks?\b/gi, 'otag:mana-rock'],
    [/\bmana dorks?\b/gi, 'otag:mana-dork'],
    [/\bfast mana\b/gi, 't:artifact mv<=2 otag:mana-rock'],
    [/\bmana doublers?\b/gi, 'otag:mana-doubler'],
    [/\bland ramp\b/gi, 'otag:land-ramp'],
    [/\brituals?\b/gi, 'otag:ritual'],

    // Card advantage
    [/\bcard draw\b/gi, 'otag:draw'],
    [/\bdraw cards?\b/gi, 'otag:draw'],
    [/\bcantrips?\b/gi, 'otag:cantrip'],
    [/\blooting\b/gi, 'otag:loot'],
    [/\bloot effects?\b/gi, 'otag:loot'],
    [/\bwheels?\b/gi, 'otag:wheel'],
    [/\bwheel effects?\b/gi, 'otag:wheel'],
    [/\bimpulse draw\b/gi, 'otag:impulse-draw'],
    [/\bexile and cast\b/gi, 'otag:impulse-draw'],
    [/\bscry effects?\b/gi, 'otag:scry'],
    [/\blandfall\b/gi, 'otag:landfall'],
    [/\blandfall triggers?\b/gi, 'otag:landfall'],
    [/\bextra land plays?\b/gi, 'otag:extra-land'],
    [/\bplay additional lands?\b/gi, 'otag:extra-land'],
    [/\bexplore\b/gi, 'o:explore'],
    [/\benchantress\b/gi, 'otag:enchantress'],
    [/\benchantress effects?\b/gi, 'otag:enchantress'],
    [/\bfree\s+discard\s+outlets?\b/gi, 'otag:discard-outlet mv=0'],
    [/\bdiscard outlets?\b/gi, 'otag:discard-outlet'],
    [/\bcopy effects?\b/gi, 'otag:copy'],
    [/\bcopy permanents?\b/gi, 'otag:copy-permanent'],
    [/\btappers?\b/gi, 'otag:tapper'],
    [/\btaps? down\b/gi, 'otag:tapper'],
    [/\bspot removal\b/gi, 'otag:spot-removal'],
    [/\bmass removal\b/gi, 'otag:mass-removal'],
    [/\bmulch\b/gi, 'otag:mulch'],

    // Tutors
    [/\btutors?\b/gi, 'otag:tutor'],
    [/\bland tutors?\b/gi, 'otag:land-tutor'],
    [/\bcreature tutors?\b/gi, 'otag:creature-tutor'],

    // Removal
    [/\bboard ?wipes?\b/gi, 'otag:boardwipe'],
    [/\bwraths?\b/gi, 'otag:boardwipe'],
    // NOTE: otag:counterspell is NOT valid — use otag:counter instead
    [/\bcounterspells?\b/gi, 'otag:counter'],
    [/\bcounter ?magic\b/gi, 'otag:counter'],
    [/\bremoval\b/gi, 'otag:removal'],
    [/\bcreature removal\b/gi, 'otag:creature-removal'],
    [
      /\bgraveyard hate\b/gi,
      '(otag:graveyard-hate or (o:"exile" o:"graveyard" -o:"your graveyard" -o:"from your graveyard") or o:"cards in graveyards" or o:"can\'t be cast from")',
    ],

    // Token generation - NOTE: otag:treasure-generator is NOT a real Scryfall tag
    [/\btreasure tokens?\b/gi, 'o:"create" o:"Treasure"'],
    [/\bmakes? treasure\b/gi, 'o:"create" o:"Treasure"'],
    // NOTE: otag:token-generator, food-generator, clue-generator, blood-generator are NOT valid
    [/\btoken generators?\b/gi, 'o:"create" o:"token"'],
    [/\bmakes? tokens?\b/gi, 'o:"create" o:"token"'],
    [
      /\bfood\s+(?:payoffs?|synerg(?:y|ies)|matters?)\b/gi,
      'o:"food" o:"you control"',
    ],
    [/\bfood tokens?\b/gi, 'o:"create" o:"Food"'],
    [/\bclue tokens?\b/gi, 'o:"create" o:"Clue"'],
    [/\bblood tokens?\b/gi, 'o:"create" o:"Blood"'],
    [
      /\bcatch[-\s]?up\s+ramp\b|\bcatchup\s+ramp\b/gi,
      '(o:"fewer lands" or o:"controls more")',
    ],
    [/\btaps?\s+for\s+mana\b/gi, 'o:"{T}" o:"add"'],
    [/\bmana\s+dorks?\b/gi, 't:creature o:"{T}" o:"add"'],
    [/\bpingers?\b/gi, 't:creature o:"deals 1 damage"'],
    [/\breskins?\b/gi, 'is:reskinned'],

    // Life and combat
    [/\blifegain\b/gi, 'otag:lifegain'],
    [/\bsoul ?sisters?\b/gi, 'otag:soul-warden-ability'],
    [/\bsoul ?warden\b/gi, 'otag:soul-warden-ability'],
    [/\bburn\b/gi, 'otag:burn'],
    [/\bfog effects?\b/gi, 'otag:fog'],
    [/\bfogs?\b/gi, 'otag:fog'],
    [/\bcombat tricks?\b/gi, 'otag:combat-trick'],
    // NOTE: otag:pump is NOT a valid Scryfall tag
    [/\bpump\b/gi, 'o:"gets" o:"+1/+1"'],

    // Recursion and graveyard
    // NOTE: otag:reanimation is NOT valid — use otag:reanimate
    [/\breanimation\b/gi, 'otag:reanimate'],
    [/\breanimate\b/gi, 'otag:reanimate'],
    [/\bself[ -]?mill\b/gi, 'otag:self-mill'],
    [/\bmill\b/gi, 'o:"mill"'],
    // NOTE: otag:graveyard-recursion is NOT valid — use otag:recursion
    [/\bgraveyard recursion\b/gi, 'otag:recursion'],
    [/\brecursion\b/gi, 'otag:recursion'],
    [/\bflashback\b/gi, 'keyword:flashback'],

    // Blink and exile
    [/\bblink\b/gi, 'otag:blink'],
    [/\bflicker\b/gi, 'otag:flicker'],
    [/\bbounce\b/gi, 'otag:bounce'],

    // Control
    // NOTE: otag:stax is NOT valid — use oracle text fallback
    [/\bstax\b/gi, '(o:"can\'t" or o:"doesn\'t untap")'],
    [/\bhatebears?\b/gi, 'otag:hatebear'],
    [/\bpillowfort\b/gi, 'otag:pillowfort'],
    [/\btheft\b/gi, 'otag:theft'],
    // NOTE: otag:mind-control is NOT valid — use otag:theft
    [/\bmind control\b/gi, 'otag:theft'],
    [/\bthreaten\b/gi, 'otag:threaten'],

    // Sacrifice
    [/\bsacrifice outlets?\b/gi, 'otag:sacrifice-outlet'],
    [/\bfree sac outlets?\b/gi, 'otag:free-sacrifice-outlet'],
    // NOTE: otag:aristocrats is NOT valid — use oracle text
    [/\baristocrats\b/gi, '(o:"whenever" (o:"dies" or o:"sacrifice"))'],
    [/\bdeath triggers?\b/gi, 'otag:death-trigger'],
    // NOTE: otag:grave-pact-effect, otag:blood-artist-effect are NOT valid
    [/\bgrave ?pact\b/gi, 'o:"whenever" o:"dies" o:"sacrifice"'],
    [/\bblood ?artist\b/gi, 'o:"whenever" o:"dies" (o:"loses" or o:"gains")'],
    [/\bsacrifice synergy\b/gi, 'otag:synergy-sacrifice'],
    [/\bsacrifice payoffs?\b/gi, 'otag:synergy-sacrifice'],
    [
      /\b(?:cards? that )?give(?:s)? me things? when.+sacrifice\b/gi,
      '(otag:synergy-sacrifice or (o:"whenever" o:"you sacrifice"))',
    ],

    // Special effects
    [/\bextra turns?\b/gi, 'otag:extra-turn'],
    [/\bproliferate cards?\b/gi, 'o:proliferate'],
    [/\bproliferate\b/gi, 'o:proliferate'],
    [/\bproliferate synergy\b/gi, 'otag:counters-matter'],
    [/\bproliferate payoffs?\b/gi, 'otag:counters-matter'],
    [/\bclones?\b/gi, 'otag:clone'],

    // Counter-related otags
    [/\bcounters? matter\b/gi, 'otag:counters-matter'],
    [/\b\+1\/\+1 counters? matter\b/gi, 'otag:counters-matter'],
    [/\bcounter synergy\b/gi, 'otag:counters-matter'],
    [/\bcounter payoffs?\b/gi, 'otag:counters-matter'],
    [/\bdoubles? counters?\b/gi, 'otag:counter-doubler'],
    [/\bcounter doubl(?:er|ing)\b/gi, 'otag:counter-doubler'],
    [/\bmoves? counters?\b/gi, 'otag:counter-movement'],
    [/\bcounter movement\b/gi, 'otag:counter-movement'],
    [/\btransfers? counters?\b/gi, 'otag:counter-movement'],

    // Synergy payoff otags
    [/\blifegain synergy\b/gi, 'otag:synergy-lifegain'],
    [/\blifegain payoffs?\b/gi, 'otag:synergy-lifegain'],
    [/\blife ?gain payoffs?\b/gi, 'otag:synergy-lifegain'],
    [/\bgaining life payoffs?\b/gi, 'otag:synergy-lifegain'],
    [/\bdiscard synergy\b/gi, 'otag:synergy-discard'],
    [/\bdiscard payoffs?\b/gi, 'otag:synergy-discard'],
    [/\bdiscarding payoffs?\b/gi, 'otag:synergy-discard'],
    [/\bequipment synergy\b/gi, 'otag:synergy-equipment'],
    [/\bequipment payoffs?\b/gi, 'otag:synergy-equipment'],
    [/\bequipment matters?\b/gi, 'otag:synergy-equipment'],

    [/\bpolymorph\b/gi, 'otag:polymorph'],
    [/\beggs?\b/gi, 'otag:egg'],
    [/\bactivate from graveyard\b/gi, 'otag:activate-from-graveyard'],
    [/\buse from graveyard\b/gi, 'otag:activate-from-graveyard'],

    // Ability-granting
    [/\bgive(?:s)? flying\b/gi, 'otag:gives-flying'],
    [/\bgrant(?:s)? flying\b/gi, 'otag:gives-flying'],
    [/\bgive(?:s)? trample\b/gi, 'otag:gives-trample'],
    [/\bgrant(?:s)? trample\b/gi, 'otag:gives-trample'],
    [/\bgive(?:s)? haste\b/gi, 'otag:gives-haste'],
    [/\bgrant(?:s)? haste\b/gi, 'otag:gives-haste'],
    [/\bgive(?:s)? vigilance\b/gi, 'otag:gives-vigilance'],
    [/\bgrant(?:s)? vigilance\b/gi, 'otag:gives-vigilance'],
    [/\bgive(?:s)? deathtouch\b/gi, 'otag:gives-deathtouch'],
    [/\bgrant(?:s)? deathtouch\b/gi, 'otag:gives-deathtouch'],
    [/\bgive(?:s)? lifelink\b/gi, 'otag:gives-lifelink'],
    [/\bgrant(?:s)? lifelink\b/gi, 'otag:gives-lifelink'],
    [/\bgive(?:s)? first strike\b/gi, 'otag:gives-first-strike'],
    [/\bgrant(?:s)? first strike\b/gi, 'otag:gives-first-strike'],
    [/\bgive(?:s)? double strike\b/gi, 'otag:gives-double-strike'],
    [/\bgrant(?:s)? double strike\b/gi, 'otag:gives-double-strike'],
    [/\bgive(?:s)? menace\b/gi, 'otag:gives-menace'],
    [/\bgrant(?:s)? menace\b/gi, 'otag:gives-menace'],
    [/\bgive(?:s)? reach\b/gi, 'otag:gives-reach'],
    [/\bgrant(?:s)? reach\b/gi, 'otag:gives-reach'],
    [/\bgive(?:s)? hexproof\b/gi, 'otag:gives-hexproof'],
    [/\bgrant(?:s)? hexproof\b/gi, 'otag:gives-hexproof'],
    [/\bgive(?:s)? indestructible\b/gi, 'otag:gives-indestructible'],
    [/\bgrant(?:s)? indestructible\b/gi, 'otag:gives-indestructible'],
    [/\bgive(?:s)? protection\b/gi, 'otag:gives-protection'],
    [/\bgrant(?:s)? protection\b/gi, 'otag:gives-protection'],

    // -1/-1 counters
    [
      /\bput.+-1\/-1 counters? on.+(?:opponent|enemy|their)\b/gi,
      'o:"put" o:"-1/-1 counter" -o:"you control"',
    ],
    [/\b-1\/-1 counters?\b/gi, 'o:"-1/-1 counter"'],
    [/\bput.+-1\/-1\b/gi, 'o:"put a -1/-1"'],
    [/\bwither\b/gi, 'o:wither'],
    [/\binfect\b/gi, 'o:infect'],

    // Card types
    [/\bspells\b/gi, '(t:instant or t:sorcery)'],
    [/\bfinishers?\b/gi, 't:creature mv>=6 pow>=6'],
    [/\blords?\b/gi, 'otag:lord'],
    [/\banthems?\b/gi, 'otag:anthem'],

    // Common tribals
    [/\belf(?:ves)?\b/gi, 't:elf'],
    [/\bgoblins?\b/gi, 't:goblin'],
    [/\bzombies?\b/gi, 't:zombie'],
    [/\bvampires?\b/gi, 't:vampire'],
    [/\bdragons?\b/gi, 't:dragon'],
    [/\bangels?\b/gi, 't:angel'],
    [/\bmerfolk\b/gi, 't:merfolk'],
    [/\bhumans?\b/gi, 't:human'],
    [/\bwizards?\b/gi, 't:wizard'],
    [/\bwarriors?\b/gi, 't:warrior'],
    [/\brogues?\b/gi, 't:rogue'],
    [/\bclerics?\b/gi, 't:cleric'],
    [/\bsoldiers?\b/gi, 't:soldier'],
    [/\bknights?\b/gi, 't:knight'],
    [/\bcats?\b/gi, 't:cat'],
    [/\bdogs?\b/gi, 't:dog'],
    [/\bdinosaurs?\b/gi, 't:dinosaur'],
    [/\bpirates?\b/gi, 't:pirate'],
    [/\bspirits?\b/gi, 't:spirit'],
    [/\belementals?\b/gi, 't:elemental'],
    [/\bslivers?\b/gi, 't:sliver'],

    // Lands
    [/\bfetch ?lands?\b/gi, 'is:fetchland'],
    [/\bshock ?lands?\b/gi, 'is:shockland'],
    [/\bdual ?lands?\b/gi, 'is:dual'],
    [/\bfast ?lands?\b/gi, 'is:fastland'],
    [/\bslow ?lands?\b/gi, 'is:slowland'],
    [/\bpain ?lands?\b/gi, 'is:painland'],
    [/\bcheck ?lands?\b/gi, 'is:checkland'],
    [/\bbounce ?lands?\b/gi, 'is:bounceland'],
    [/\bman ?lands?\b/gi, 'is:creatureland'],
    [/\btriomes?\b/gi, 'is:triome'],

    // Formats
    [/\bcommander legal\b/gi, 'f:commander'],
    [/\bedh legal\b/gi, 'f:commander'],
    [/\bmodern legal\b/gi, 'f:modern'],
    [/\bstandard legal\b/gi, 'f:standard'],
    [/\bpioneer legal\b/gi, 'f:pioneer'],
    [/\blegacy legal\b/gi, 'f:legacy'],
    [/\bpauper legal\b/gi, 'f:pauper'],

    // Guilds/Shards/Wedges
    [/\brakdos\b/gi, 'id=br'],
    [/\bsimic\b/gi, 'id=ug'],
    [/\bgruul\b/gi, 'id=rg'],
    [/\borzhov\b/gi, 'id=wb'],
    [/\bazorius\b/gi, 'id=wu'],
    [/\bdimir\b/gi, 'id=ub'],
    [/\bgolgari\b/gi, 'id=bg'],
    [/\bboros\b/gi, 'id=rw'],
    [/\bselesnya\b/gi, 'id=gw'],
    [/\bizzet\b/gi, 'id=ur'],
    [/\besper\b/gi, 'id=wub'],
    [/\bgrixis\b/gi, 'id=ubr'],
    [/\bjund\b/gi, 'id=brg'],
    [/\bnaya\b/gi, 'id=wrg'],
    [/\bbant\b/gi, 'id=wug'],
    [/\babzan\b/gi, 'id=wbg'],
    [/\bjeskai\b/gi, 'id=wur'],
    [/\bsultai\b/gi, 'id=ubg'],
    [/\bmardu\b/gi, 'id=wbr'],
    [/\btemur\b/gi, 'id=urg'],

    // Price
    [/\bcheap\b/gi, 'mv<=3'],
    [/\bbudget\b/gi, 'mv<=3'],
    [/\baffordable\b/gi, 'mv<=3'],
    [/\binexpensive\b/gi, 'mv<=3'],
    [/\bexpensive\b/gi, 'usd>20'],
    [/\bcostly\b/gi, 'usd>20'],
    [/\bunder \$?(\d+)\b/gi, 'usd<$1'],
    [/\bover \$?(\d+)\b/gi, 'usd>$1'],
    [/\bless than \$?(\d+)\b/gi, 'usd<$1'],
    [/\bmore than \$?(\d+)\b/gi, 'usd>$1'],

    // Rarities
    [/\bmythics?\b/gi, 'r:mythic'],
    [/\brares?\b/gi, 'r:rare'],
    [/\buncommons?\b/gi, 'r:uncommon'],
    [/\bcommons?\b/gi, 'r:common'],

    // Trigger patterns
    [/\bdeath triggers?\b/gi, 'o:"dies"'],
    [/\bdies triggers?\b/gi, 'o:"dies"'],
    [/\battack triggers?\b/gi, 'o:"whenever" o:"attacks"'],
    [/\bcast triggers?\b/gi, 'o:"whenever" o:"cast"'],

    // New card types
    [/\bbattles?\b/gi, 't:battle'],
    [/\bcases?\b/gi, 't:case'],
    [/\brooms?\b/gi, 't:room'],
    [/\bclasses?\b/gi, 't:class'],

    // Power/toughness
    [/\bpower greater than toughness\b/gi, 'pow>tou'],
    [/\bpower > toughness\b/gi, 'pow>tou'],
    [/\btoughness greater than power\b/gi, 'tou>pow'],
    [/\btoughness > power\b/gi, 'tou>pow'],
    [/\bbig butts?\b/gi, 'tou>pow'],
    [/\bhigh toughness\b/gi, 'tou>=4'],
    [/\bhigh power\b/gi, 'pow>=4'],

    // Date/year
    [/\brecent cards?\b/gi, 'year>=2023'],
    [/\bnew cards?\b/gi, 'year>=2023'],
    [/\bold cards?\b/gi, 'year<2003'],
    [/\bclassic cards?\b/gi, 'year<2003'],
    [/\bafter (\d{4})\b/gi, 'year>$1'],
    [/\bbefore (\d{4})\b/gi, 'year<$1'],
    [/\bfrom (\d{4})\b/gi, 'year=$1'],
    [/\breleased in (\d{4})\b/gi, 'year=$1'],

    // Reprint status
    [/\breserved list\b/gi, 'is:reserved'],
    [/\bRL cards?\b/gi, 'is:reserved'],
    [/\bfirst print(?:ing)?\b/gi, 'is:firstprint'],
    [/\boriginal print(?:ing)?\b/gi, 'is:firstprint'],
    [/\breprints? only\b/gi, 'is:reprint'],

    // Commander mechanics
    [/\bpartner commanders?\b/gi, 't:legendary t:creature o:"partner"'],
    [/\bbackgrounds?\b/gi, 't:background'],
    [/\bchoose a background\b/gi, 'o:"choose a background"'],
    [/\bcompanions?\b/gi, 'is:companion'],

    // Special card types
    [/\bsagas?\b/gi, 't:saga'],

    // Frame/art variants
    [/\bfull ?art\b/gi, 'is:fullart'],
    [/\bborderless\b/gi, 'is:borderless'],
    [/\bshowcase\b/gi, 'is:showcase'],
    [/\bextended ?art\b/gi, 'is:extendedart'],
    [/\bold border\b/gi, 'frame:2003'],
    [/\bretro frame\b/gi, 'frame:2003'],
    [/\bmodern frame\b/gi, 'frame:2015'],
  ];

  if (remainingQuery) {
    const looksLikeScryfall = /[a-z]+[:=<>]/.test(remainingQuery);
    if (!looksLikeScryfall) {
      for (const [pattern, replacement] of basicTransforms) {
        remainingQuery = remainingQuery.replace(pattern, replacement);
      }
    }
    remainingQuery = wrapBareWords(remainingQuery);
  }

  fallbackQuery = [fallbackQuery, remainingQuery]
    .filter(Boolean)
    .join(' ')
    .trim();

  // Apply filters
  if (filters?.format) {
    fallbackQuery += ` f:${filters.format}`;
  }
  if (filters?.colorIdentity?.length) {
    fallbackQuery += ` ci=${filters.colorIdentity.join('').toLowerCase()}`;
  }

  const validation = validateQuery(fallbackQuery);

  return {
    sanitized: validation.sanitized,
    issues: validation.issues,
  };
}

export function applyFiltersToQuery(
  query: string,
  filters?: { format?: string; colorIdentity?: string[] } | null,
): string {
  let filteredQuery = query.trim();

  if (filters?.format) {
    filteredQuery += ` f:${filters.format}`;
  }
  if (filters?.colorIdentity?.length) {
    filteredQuery += ` ci=${filters.colorIdentity.join('').toLowerCase()}`;
  }

  return filteredQuery.trim();
}
