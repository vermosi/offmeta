import { describe, expect, it } from 'vitest';
import {
  parseGlossary,
  stripHtml,
} from '../../../../supabase/functions/_shared/cr-glossary-parse';
import {
  buildRulesGrounding,
  glossaryClauses,
  matchGlossaryTerms,
  type GlossaryTerm,
} from '../../../../supabase/functions/semantic-search/pipeline/rules-glossary';

const SAMPLE_HTML = `
<h1 id=R.glossary>Glossary</h1>
<div id=Ra></div>
<p id=amass><a href="#amass">Amass</a>: A <a href="#keyword_action">keyword action</a> that gives <a href="#you_your">you</a> a Zombie Army <a href="#creature">creature</a> <a href="#token">token</a>. See rule <a href="#R70147">701.47</a>, "Amass."
<p id=deathtouch><a href="#deathtouch">Deathtouch</a>: A <a href="#keyword_ability">keyword ability</a> that causes <a href="#damage">damage</a> to be especially effective. See rule <a href="#R7022">702.2</a>.
<p id=graveyard><a href="#graveyard">Graveyard</a>: 1. A zone. A player's graveyard is their discard pile. See rule <a href="#R404">404</a>.
`;

describe('cr-glossary-parse', () => {
  it('decodes and collapses markup', () => {
    expect(stripHtml('<a href="#x">Foo</a>&nbsp;&amp;  bar')).toBe('Foo & bar');
  });

  it('parses glossary entries with terms, definitions and rule refs', () => {
    const entries = parseGlossary(SAMPLE_HTML);
    expect(entries).toHaveLength(3);

    const deathtouch = entries.find((e) => e.slug === 'deathtouch');
    expect(deathtouch?.term).toBe('Deathtouch');
    expect(deathtouch?.category).toBe('keyword_ability');
    expect(deathtouch?.scryfallHint).toBe('keyword:"deathtouch"');
    expect(deathtouch?.ruleRefs).toContain('702.2');
  });

  it('classifies keyword actions and leaves general terms unhinted', () => {
    const entries = parseGlossary(SAMPLE_HTML);
    expect(entries.find((e) => e.slug === 'amass')?.category).toBe('keyword_action');
    expect(entries.find((e) => e.slug === 'amass')?.scryfallHint).toBe('oracle:"amass"');
    expect(entries.find((e) => e.slug === 'graveyard')?.scryfallHint).toBeNull();
  });

  it('ignores paragraphs without a term separator', () => {
    expect(parseGlossary('<h1 id=R.glossary>Glossary</h1><p id=x>no separator here')).toHaveLength(0);
  });
});

const TERMS: GlossaryTerm[] = [
  {
    term: 'Deathtouch',
    termLower: 'deathtouch',
    definition: 'A keyword ability that causes damage to be especially effective.',
    category: 'keyword_ability',
    scryfallHint: 'keyword:"deathtouch"',
  },
  {
    term: 'Amass',
    termLower: 'amass',
    definition: 'A keyword action that gives you a Zombie Army creature token.',
    category: 'keyword_action',
    scryfallHint: 'oracle:"amass"',
  },
  {
    term: 'Keyword Ability',
    termLower: 'keyword ability',
    definition: 'A shorthand for a set of rules.',
    category: 'general',
    scryfallHint: null,
  },
];

describe('rules-glossary matching', () => {
  it('matches terms on word boundaries and plurals', () => {
    const matches = matchGlossaryTerms('creatures with deathtouch that amass', TERMS);
    expect(matches.map((m) => m.term)).toEqual(['Deathtouch', 'Amass']);
  });

  it('does not match terms inside larger words', () => {
    expect(matchGlossaryTerms('amassing tokens', TERMS)).toHaveLength(0);
  });

  it('returns nothing for an empty query', () => {
    expect(matchGlossaryTerms('   ', TERMS)).toHaveLength(0);
  });

  it('only turns keyword abilities into Scryfall clauses', () => {
    const matches = matchGlossaryTerms('deathtouch amass', TERMS);
    expect(glossaryClauses(matches)).toEqual(['keyword:"deathtouch"']);
  });

  it('builds a grounding block only when terms matched', () => {
    expect(buildRulesGrounding([])).toBe('');
    const grounding = buildRulesGrounding(matchGlossaryTerms('deathtouch', TERMS));
    expect(grounding).toContain('OFFICIAL RULES CONTEXT');
    expect(grounding).toContain('Deathtouch (keyword ability)');
  });
});
