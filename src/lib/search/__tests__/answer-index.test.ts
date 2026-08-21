import { describe, expect, it } from 'vitest';
import {
  buildAnswerQuery,
  buildNamesClause,
  looksLikeAnswerableQuestion,
  normalizeQuestion,
  pickBestAnswer,
  scoreAnswerRow,
  tokenizeQuestion,
} from '../../../../supabase/functions/semantic-search/answer-index';

const boros = {
  question: 'anthem in boros color identity that gives your creatures indestructible',
  keywords: ['anthem', 'boros', 'color', 'identity', 'creatures', 'indestructible'],
  card_names: ['Boros Charm', 'Unbreakable Formation'],
  scryfall_query: '(!"Boros Charm" or !"Unbreakable Formation") game:paper',
  confidence: 0.9,
};

describe('tokenizeQuestion', () => {
  it('drops stopwords and short tokens', () => {
    expect(tokenizeQuestion('cards that give your creatures indestructible')).toEqual([
      'creatures',
      'indestructible',
    ]);
  });

  it('normalizes punctuation and case', () => {
    expect(normalizeQuestion('  Boros ANTHEM, indestructible!  ')).toBe(
      'boros anthem indestructible',
    );
  });
});

describe('looksLikeAnswerableQuestion', () => {
  it('accepts descriptive effect questions', () => {
    expect(
      looksLikeAnswerableQuestion(
        'anthem in boros color identity that gives your creatures indestructible',
      ),
    ).toBe(true);
  });

  it('rejects card names and raw Scryfall syntax', () => {
    expect(looksLikeAnswerableQuestion('Sol Ring')).toBe(false);
    expect(looksLikeAnswerableQuestion('t:creature ci:rw kw:indestructible')).toBe(false);
  });
});

describe('scoreAnswerRow', () => {
  it('scores an exact concept overlap highest', () => {
    const exact = scoreAnswerRow(boros.keywords, boros.keywords);
    const partial = scoreAnswerRow(['boros', 'indestructible'], boros.keywords);
    expect(exact).toBeGreaterThan(partial);
    expect(exact).toBeCloseTo(1, 5);
  });

  it('requires at least two shared concepts', () => {
    expect(scoreAnswerRow(['indestructible'], boros.keywords)).toBe(0);
  });
});

describe('pickBestAnswer', () => {
  it('matches a stored question phrased slightly differently', () => {
    const match = pickBestAnswer(
      'boros anthem that gives creatures indestructible',
      [boros],
      0.6,
    );
    expect(match?.row.question).toBe(boros.question);
  });

  it('returns null for unrelated questions', () => {
    expect(
      pickBestAnswer('blue instants that counter creature spells', [boros]),
    ).toBeNull();
  });
});

describe('buildAnswerQuery', () => {
  it('unions exact names with the broader interpretation', () => {
    expect(buildAnswerQuery(['Boros Charm', 'Make a Stand'], 'ci:rw o:indestructible')).toBe(
      '((!"Boros Charm" or !"Make a Stand") or (ci:rw o:indestructible)) game:paper',
    );
  });

  it('does not duplicate the paper filter', () => {
    const query = buildAnswerQuery(['Boros Charm'], 'ci:rw game:paper');
    expect(query.match(/game:paper/g)).toHaveLength(1);
  });

  it('falls back to the broader query when no names resolve', () => {
    expect(buildAnswerQuery([], 'ci:rw o:indestructible')).toBe('ci:rw o:indestructible');
    expect(buildNamesClause(['  '])).toBe('');
  });
});
