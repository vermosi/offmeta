import { describe, it, expect } from 'vitest';
import { buildDeterministicIntent } from '../../../supabase/functions/semantic-search/deterministic';

const getQuery = (input: string) => buildDeterministicIntent(input).deterministicQuery;

describe('Deterministic MTG query translation', () => {
  it('T1: artifacts that produce 2 mana and cost four or less', () => {
    const query = getQuery('artifact that produced 2 mana and costs four or less mana');
    expect(query).toContain('t:artifact');
    expect(query).toContain('mv<=4');
    expect(query).toContain('-t:land');
    expect(query.includes('o:"add {c}{c}"') || query.includes('o:/add')).toBe(true);
  });

  it('T2: red or black creature that costs at least 5 mana and will draw cards', () => {
    const query = getQuery('red or black creature that costs at least 5 mana and will draw cards');
    expect(query).toContain('t:creature');
    expect(query).toContain('mv>=5');
    expect(query).toContain('(c=r or c=b)');
    expect(query).toMatch(/otag:draw|o:\/draw/i);
    expect(query).not.toMatch(/c=u|c=g/);
  });

  it('T3: 5 mana mono red creature', () => {
    const query = getQuery('5 mana mono red creature');
    expect(query).toContain('t:creature');
    expect(query).toContain('mv=5');
    expect(query).toContain('c=r');
    expect(query).toContain('ci=r');
  });

  it('T4: green cards that let you sacrifice lands', () => {
    const query = getQuery('green cards that let you sacrifice lands');
    expect(query).toContain('c=g');
    expect(query).toContain('-t:land');
    expect(query).toContain('o:sacrifice');
    expect(query).toContain('o:land');
  });

  it('T5: equipment which costs 3 and equip for 2', () => {
    const query = getQuery('equipment which costs 3 and equip for 2');
    expect(query).toContain('t:equipment');
    expect(query).toContain('mv=3');
    expect(query).toContain('o:"equip {2}"');
  });

  it('T6: green soul sisters released after 2020', () => {
    const query = getQuery('show me all the green soul sisters released after 2020');
    expect(query).toContain('c=g');
    expect(query).toContain('otag:soul-warden-ability');
    expect(query).toContain('year>2020');
    expect(query).not.toMatch(/e:202/);
  });

  it('T7: produce 2 mana without lands', () => {
    const query = getQuery('cards that produce 2 mana');
    expect(query).toContain('(o:"add {c}{c}" or o:/add');
    expect(query).toContain('-t:land');
  });

  it('T8: cards with cows in the art', () => {
    const query = getQuery('cards with cows in the art');
    expect(query).toContain('atag:cow');
  });

  it('T9: cards that share a name with a set', () => {
    const query = getQuery('cards that share a name with a set');
    expect(query).toContain('otag:shares-name-with-set');
    expect(query).not.toContain('o:"set"');
  });

  it('T10: creatures that care about graveyard order', () => {
    const query = getQuery('creatures that care about graveyard order');
    expect(query).toContain('t:creature');
    expect(query).toContain('otag:graveyard-order-matters');
  });

  it('T11: multicolor commanders with blue activated ability without mana cost', () => {
    const query = getQuery('commanders with more than one color, one of which is blue, with an activated ability that does not cost mana');
    expect(query).toContain('is:commander');
    expect(query).toMatch(/id>1/);
    expect(query).toMatch(/ci>=u/);
    expect(query).toContain('o:":"');
    expect(query).toContain('-o:/\\{[WUBRG0-9XSC]\\}:/');
  });

  it('T12: creatures usable with Jegantha companion', () => {
    const query = getQuery('Creature cards usable with a Jegantha companion');
    expect(query).toContain('t:creature');
    expect(query).toContain('-mana:{W}{W}');
    expect(query).toContain('-mana:{U}{U}');
    expect(query).toContain('-mana:{B}{B}');
    expect(query).toContain('-mana:{R}{R}');
    expect(query).toContain('-mana:{G}{G}');
  });

  it('T13: color identity for commander deck fits', () => {
    const query = getQuery('fits into a BR commander deck');
    expect(query).toContain('ci<=br');
    expect(query).not.toContain('c=br');
  });

  it('T14: rakdos creature uses color, not identity', () => {
    const query = getQuery('rakdos creature');
    expect(query).toContain('t:creature');
    expect(query).toContain('c=br');
  });

  it('T15: at least 4 power creatures', () => {
    const query = getQuery('creatures with at least 4 power');
    expect(query).toContain('t:creature');
    expect(query).toContain('pow>=4');
  });

  it('T16: toughness 2 or less', () => {
    const query = getQuery('creatures with 2 toughness or less');
    expect(query).toContain('t:creature');
    expect(query).toContain('tou<=2');
  });

  it('T17: equipment with equip cost 1 or less', () => {
    const query = getQuery('equipment with equip cost 1 or less');
    expect(query).toContain('t:equipment');
    expect(query).toContain('o:/equip \\{[0-1]\\}/');
  });
});
