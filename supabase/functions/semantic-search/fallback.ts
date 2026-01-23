import { buildDeterministicIntent } from './deterministic.ts';
import { validateQuery } from './validation.ts';

/**
 * Builds a fallback Scryfall query using deterministic rules and basic transformations.
 * Used when AI translation remains unavailable or fails.
 */
export function buildFallbackQuery(
  query: string,
  filters?: { format?: string; colorIdentity?: string[] },
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
    [/\bboard ?wipes?\b/gi, 'otag:board-wipe'],
    [/\bwraths?\b/gi, 'otag:board-wipe'],
    [/\bcounterspells?\b/gi, 'otag:counterspell'],
    [/\bcounter ?magic\b/gi, 'otag:counterspell'],
    [/\bremoval\b/gi, 'otag:removal'],
    [/\bcreature removal\b/gi, 'otag:creature-removal'],
    [/\bgraveyard hate\b/gi, 'otag:graveyard-hate'],

    // Token generation
    [/\btreasure tokens?\b/gi, 'otag:treasure-generator'],
    [/\bmakes? treasure\b/gi, 'otag:treasure-generator'],
    [/\btoken generators?\b/gi, 'otag:token-generator'],
    [/\bmakes? tokens?\b/gi, 'otag:token-generator'],
    [/\bfood tokens?\b/gi, 'otag:food-generator'],
    [/\bclue tokens?\b/gi, 'otag:clue-generator'],
    [/\bblood tokens?\b/gi, 'otag:blood-generator'],

    // Life and combat
    [/\blifegain\b/gi, 'otag:lifegain'],
    [/\bsoul ?sisters?\b/gi, 'otag:soul-warden-ability'],
    [/\bsoul ?warden\b/gi, 'otag:soul-warden-ability'],
    [/\bburn\b/gi, 'otag:burn'],
    [/\bfog effects?\b/gi, 'otag:fog'],
    [/\bfogs?\b/gi, 'otag:fog'],
    [/\bcombat tricks?\b/gi, 'otag:combat-trick'],
    [/\bpump\b/gi, 'otag:pump'],

    // Recursion and graveyard
    [/\breanimation\b/gi, 'otag:reanimation'],
    [/\breanimate\b/gi, 'otag:reanimation'],
    [/\bself[ -]?mill\b/gi, 'otag:self-mill'],
    [/\bmill\b/gi, 'otag:mill'],
    [/\bgraveyard recursion\b/gi, 'otag:graveyard-recursion'],
    [/\brecursion\b/gi, 'otag:graveyard-recursion'],
    [/\bflashback\b/gi, 'keyword:flashback'],

    // Blink and exile
    [/\bblink\b/gi, 'otag:blink'],
    [/\bflicker\b/gi, 'otag:flicker'],
    [/\bbounce\b/gi, 'otag:bounce'],

    // Control
    [/\bstax\b/gi, 'otag:stax'],
    [/\bhatebears?\b/gi, 'otag:hatebear'],
    [/\bpillowfort\b/gi, 'otag:pillowfort'],
    [/\btheft\b/gi, 'otag:theft'],
    [/\bmind control\b/gi, 'otag:mind-control'],
    [/\bthreaten\b/gi, 'otag:threaten'],

    // Sacrifice
    [/\bsacrifice outlets?\b/gi, 'otag:sacrifice-outlet'],
    [/\bfree sac outlets?\b/gi, 'otag:free-sacrifice-outlet'],
    [/\baristocrats\b/gi, 'otag:aristocrats'],
    [/\bdeath triggers?\b/gi, 'otag:death-trigger'],
    [/\bgrave ?pact\b/gi, 'otag:grave-pact-effect'],
    [/\bblood ?artist\b/gi, 'otag:blood-artist-effect'],
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
    [/\bproliferate synergy\b/gi, 'otag:synergy-proliferate'],
    [/\bproliferate payoffs?\b/gi, 'otag:synergy-proliferate'],
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
  filters?: { format?: string; colorIdentity?: string[] },
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
