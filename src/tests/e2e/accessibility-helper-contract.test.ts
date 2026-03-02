import type { Page, TestInfo } from '@playwright/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockWithTags = vi.fn();
const mockInclude = vi.fn();
const mockAnalyze = vi.fn();
const mockAxeBuilder = vi.fn();

vi.mock('@axe-core/playwright', () => {
  class MockAxeBuilder {
    constructor(options: { page: Page }) {
      mockAxeBuilder(options);
    }

    withTags(tags: string[]) {
      mockWithTags(tags);
      return this;
    }

    include(scope: string) {
      mockInclude(scope);
      return this;
    }

    async analyze() {
      return mockAnalyze();
    }
  }

  return { default: MockAxeBuilder };
});

import { runAxeAudit } from '@/tests/e2e/axe-helpers';

type MockViolation = {
  id: string;
  impact: 'critical' | 'serious' | 'moderate';
  description: string;
  help: string;
  helpUrl: string;
  nodes: Array<Record<string, unknown>>;
};

function createViolation(
  id: string,
  impact: MockViolation['impact'],
): MockViolation {
  return {
    id,
    impact,
    description: `${id} description`,
    help: `${id} help`,
    helpUrl: `https://example.com/${id}`,
    nodes: [{}],
  };
}

function createMockPage(): Page {
  return {
    url: () => 'http://localhost/mock-page',
  } as unknown as Page;
}

function createMockTestInfo() {
  return {
    attach: vi.fn(async () => undefined),
  } as unknown as Pick<TestInfo, 'attach'>;
}

describe('runAxeAudit helper contract', () => {
  beforeEach(() => {
    mockWithTags.mockReset();
    mockInclude.mockReset();
    mockAnalyze.mockReset();
    mockAxeBuilder.mockReset();
  });

  it('returns blockingViolations and moderateViolations arrays for a minimal page', async () => {
    mockAnalyze.mockResolvedValue({
      violations: [
        createViolation('critical-violation', 'critical'),
        createViolation('moderate-violation', 'moderate'),
      ],
    });

    const page = createMockPage();
    const testInfo = createMockTestInfo();

    const result = await runAxeAudit(page, testInfo as TestInfo, {
      context: 'contract-minimal-page',
    });

    expect(result).toEqual({
      blockingViolations: [createViolation('critical-violation', 'critical')],
      moderateViolations: [createViolation('moderate-violation', 'moderate')],
    });
    expect(Array.isArray(result.blockingViolations)).toBe(true);
    expect(Array.isArray(result.moderateViolations)).toBe(true);
  });

  it('applies the WCAG tag set and forwards include scope to AxeBuilder', async () => {
    mockAnalyze.mockResolvedValue({ violations: [] });

    const page = createMockPage();
    const testInfo = createMockTestInfo();

    await runAxeAudit(page, testInfo as TestInfo, {
      scope: '#scope',
      context: 'contract-tags',
    });

    expect(mockAxeBuilder).toHaveBeenCalledWith({ page });
    expect(mockWithTags).toHaveBeenCalledWith([
      'wcag2a',
      'wcag2aa',
      'wcag21a',
      'wcag21aa',
    ]);
    expect(mockInclude).toHaveBeenCalledWith('#scope');
  });

  it('attaches moderate-violations artifact when moderate findings exist', async () => {
    mockAnalyze.mockResolvedValue({
      violations: [
        createViolation('moderate-violation-a', 'moderate'),
        createViolation('moderate-violation-b', 'moderate'),
      ],
    });

    const page = createMockPage();
    const testInfo = createMockTestInfo();

    await runAxeAudit(page, testInfo as TestInfo, {
      context: 'contract-attach',
    });

    expect(testInfo.attach).toHaveBeenCalledTimes(1);
    expect(testInfo.attach).toHaveBeenCalledWith(
      'contract-attach-moderate-violations.json',
      expect.objectContaining({
        contentType: 'application/json',
      }),
    );

    const attachCall = vi.mocked(testInfo.attach).mock.calls[0];
    const attachedPayload = JSON.parse(String(attachCall[1]?.body));

    expect(attachedPayload).toMatchObject({
      url: 'http://localhost/mock-page',
      count: 2,
    });
    expect(attachedPayload.violations).toHaveLength(2);
  });
});
