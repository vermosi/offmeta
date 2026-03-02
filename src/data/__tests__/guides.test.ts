import { describe, it, expect } from 'vitest';
import { GUIDES, getGuideBySlug, type Guide } from '@/data/guides';

describe('guides data', () => {
  describe('GUIDES array structure', () => {
    it('contains exactly 10 guides', () => {
      expect(GUIDES).toHaveLength(10);
    });

    it('has levels from 1 to 10 with no gaps', () => {
      const levels = GUIDES.map((g) => g.level).sort((a, b) => a - b);
      expect(levels).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    it('has unique slugs for every guide', () => {
      const slugs = GUIDES.map((g) => g.slug);
      const uniqueSlugs = new Set(slugs);
      expect(uniqueSlugs.size).toBe(GUIDES.length);
    });

    it('has unique levels for every guide', () => {
      const levels = GUIDES.map((g) => g.level);
      const uniqueLevels = new Set(levels);
      expect(uniqueLevels.size).toBe(GUIDES.length);
    });

    it('has non-empty required fields for every guide', () => {
      const requiredStringFields: (keyof Guide)[] = [
        'slug',
        'title',
        'metaTitle',
        'metaDescription',
        'heading',
        'subheading',
        'intro',
        'searchQuery',
        'translatedQuery',
        'howOffmetaHelps',
      ];

      for (const guide of GUIDES) {
        for (const field of requiredStringFields) {
          expect(
            (guide[field] as string).length,
            `Guide "${guide.slug}" should have non-empty ${field}`,
          ).toBeGreaterThan(0);
        }
      }
    });

    it('has at least 2 tips for every guide', () => {
      for (const guide of GUIDES) {
        expect(
          guide.tips.length,
          `Guide "${guide.slug}" should have at least 2 tips`,
        ).toBeGreaterThanOrEqual(2);
      }
    });

    it('has at least 1 FAQ entry for every guide', () => {
      for (const guide of GUIDES) {
        expect(
          guide.faq.length,
          `Guide "${guide.slug}" should have at least 1 FAQ`,
        ).toBeGreaterThanOrEqual(1);
      }
    });

    it('has FAQ entries with non-empty question and answer', () => {
      for (const guide of GUIDES) {
        for (const faq of guide.faq) {
          expect(faq.question.length).toBeGreaterThan(0);
          expect(faq.answer.length).toBeGreaterThan(0);
        }
      }
    });

    it('has related guides that reference existing slugs', () => {
      const allSlugs = new Set(GUIDES.map((g) => g.slug));
      for (const guide of GUIDES) {
        for (const related of guide.relatedGuides) {
          expect(
            allSlugs.has(related),
            `Guide "${guide.slug}" references non-existent related guide "${related}"`,
          ).toBe(true);
        }
      }
    });

    it('does not have self-referencing related guides', () => {
      for (const guide of GUIDES) {
        expect(
          guide.relatedGuides.includes(guide.slug),
          `Guide "${guide.slug}" should not reference itself`,
        ).toBe(false);
      }
    });
  });

  describe('SEO metadata quality', () => {
    it('has meta titles under 70 characters', () => {
      for (const guide of GUIDES) {
        expect(
          guide.metaTitle.length,
          `Guide "${guide.slug}" metaTitle is too long: ${guide.metaTitle.length} chars`,
        ).toBeLessThanOrEqual(70);
      }
    });

    it('has meta descriptions under 170 characters', () => {
      for (const guide of GUIDES) {
        expect(
          guide.metaDescription.length,
          `Guide "${guide.slug}" metaDescription is too long: ${guide.metaDescription.length} chars`,
        ).toBeLessThanOrEqual(170);
      }
    });

    it('has slugs using only lowercase kebab-case', () => {
      const kebabRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
      for (const guide of GUIDES) {
        expect(
          kebabRegex.test(guide.slug),
          `Guide slug "${guide.slug}" should be kebab-case`,
        ).toBe(true);
      }
    });
  });

  describe('difficulty progression', () => {
    it('levels 1-3 are beginner topics', () => {
      const beginnerGuides = GUIDES.filter((g) => g.level <= 3);
      expect(beginnerGuides).toHaveLength(3);
      // Beginner guides should have simpler search queries
      for (const guide of beginnerGuides) {
        expect(guide.searchQuery.split(' ').length).toBeLessThanOrEqual(8);
      }
    });

    it('level 10 guide handles multi-constraint queries', () => {
      const expertGuide = GUIDES.find((g) => g.level === 10);
      expect(expertGuide).toBeDefined();
      expect(expertGuide!.translatedQuery).toContain('t:');
      expect(expertGuide!.translatedQuery).toContain('f:');
    });
  });

  describe('getGuideBySlug', () => {
    it('returns the correct guide for a valid slug', () => {
      const guide = getGuideBySlug('search-by-creature-type');
      expect(guide).toBeDefined();
      expect(guide!.level).toBe(1);
      expect(guide!.title).toBe('Search by Creature Type');
    });

    it('returns undefined for a non-existent slug', () => {
      expect(getGuideBySlug('non-existent-slug')).toBeUndefined();
    });

    it('returns undefined for an empty string', () => {
      expect(getGuideBySlug('')).toBeUndefined();
    });

    it('finds every guide by its slug', () => {
      for (const guide of GUIDES) {
        const found = getGuideBySlug(guide.slug);
        expect(found).toBeDefined();
        expect(found!.slug).toBe(guide.slug);
      }
    });
  });

  describe('content quality', () => {
    it('intros are at least 100 characters', () => {
      for (const guide of GUIDES) {
        expect(
          guide.intro.length,
          `Guide "${guide.slug}" intro is too short`,
        ).toBeGreaterThanOrEqual(100);
      }
    });

    it('howOffmetaHelps sections explain the translation', () => {
      for (const guide of GUIDES) {
        // Each help section should reference OffMeta or Scryfall
        const text = guide.howOffmetaHelps.toLowerCase();
        const mentionsRelevant =
          text.includes('offmeta') ||
          text.includes('scryfall') ||
          text.includes('translat') ||
          text.includes('filter') ||
          text.includes('query');
        expect(
          mentionsRelevant,
          `Guide "${guide.slug}" howOffmetaHelps should explain translation`,
        ).toBe(true);
      }
    });

    it('translated queries contain valid Scryfall operators', () => {
      const validOperators = ['t:', 'o:', 'c:', 'id', 'f:', 'kw:', 'usd', 'otag:', '-t:'];
      for (const guide of GUIDES) {
        const hasOperator = validOperators.some((op) =>
          guide.translatedQuery.includes(op),
        );
        expect(
          hasOperator,
          `Guide "${guide.slug}" translatedQuery should contain valid Scryfall operators`,
        ).toBe(true);
      }
    });
  });
});
