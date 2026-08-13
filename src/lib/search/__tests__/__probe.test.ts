import { describe, it, expect } from 'vitest';
import { matchArtTagQuery } from '../../dev-server/supabase/functions/_shared/artTagMatching';
const qs = ['dragon cards','treasure tokens','goblin art','vampire artwork','angels','zombie cards','sacrifice outlets','wizards','cat tokens','red dragon','artifact cards','lands','elf tribal','knight creatures','snakes','spider art','soldier tokens','human wizards','wolf pack','dog cards','bird creatures','beast cards','demon cards','mountains','plains','swamps','draw two cards','counterspells','shirtless cards'];
describe('probe', () => { it('logs', () => { for (const q of qs) console.log(q, '=>', matchArtTagQuery(q)?.query ?? 'null'); expect(1).toBe(1); }); });
