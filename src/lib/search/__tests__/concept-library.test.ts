/**
 * Tests for the concept library entries, ensuring correctness of
 * aliases, templates, and category assignments.
 * @module lib/search/__tests__/concept-library
 */

import { describe, it, expect } from 'vitest';
import { CONCEPT_LIBRARY } from '../../../../supabase/functions/semantic-search/pipeline/concept-library';

describe('CONCEPT_LIBRARY', () => {
  it('contains the edict concept', () => {
    expect(CONCEPT_LIBRARY).toHaveProperty('edict');
  });

  describe('edict concept', () => {
    const edict = CONCEPT_LIBRARY.edict;

    it('has correct category', () => {
      expect(edict.category).toBe('sacrifice');
    });

    it('has expected aliases', () => {
      expect(edict.aliases).toContain('edict');
      expect(edict.aliases).toContain('edict effect');
      expect(edict.aliases).toContain('force sacrifice');
      expect(edict.aliases).toContain('opponents sacrifice');
    });

    it('template targets opponents', () => {
      expect(edict.templates[0]).toContain('sacrifices');
      expect(edict.templates[0]).toMatch(/opponent|player/);
    });

    it('has a description', () => {
      expect(edict.description).toBeTruthy();
      expect(edict.description.toLowerCase()).toContain('sacrifice');
    });
  });

  describe('structural invariants', () => {
    const entries = Object.entries(CONCEPT_LIBRARY);

    it('all concepts have at least one alias', () => {
      for (const [id, concept] of entries) {
        expect(concept.aliases.length, `${id} has no aliases`).toBeGreaterThan(0);
      }
    });

    it('all concepts have at least one template', () => {
      for (const [id, concept] of entries) {
        expect(concept.templates.length, `${id} has no templates`).toBeGreaterThan(0);
      }
    });

    it('all concepts have a category', () => {
      for (const [id, concept] of entries) {
        expect(concept.category, `${id} has no category`).toBeTruthy();
      }
    });

    it('all concepts have a priority between 1 and 100', () => {
      for (const [id, concept] of entries) {
        expect(concept.priority, `${id} has invalid priority`).toBeGreaterThanOrEqual(1);
        expect(concept.priority, `${id} has invalid priority`).toBeLessThanOrEqual(100);
      }
    });

    it('no duplicate aliases across concepts', () => {
      const aliasMap = new Map<string, string>();
      for (const [id, concept] of entries) {
        for (const alias of concept.aliases) {
          const prev = aliasMap.get(alias);
          if (prev) {
            expect.soft(prev, `Alias "${alias}" is duplicated in "${id}" and "${prev}"`).toBe(id);
          }
          aliasMap.set(alias, id);
        }
      }
    });

    it('sacrifice category concepts share same category', () => {
      const sacrificeConcepts = entries.filter(([, c]) => c.category === 'sacrifice');
      expect(sacrificeConcepts.length).toBeGreaterThanOrEqual(3); // edict, sacrifice_outlet, aristocrats
      for (const [id, concept] of sacrificeConcepts) {
        expect(concept.category, `${id} should be sacrifice`).toBe('sacrifice');
      }
    });
  });
});
