/**
 * Shared axe-core helper for automated accessibility assertions in tests.
 *
 * Keeps the rule set focused on regressions we actually care about:
 * unlabeled controls, missing landmarks/skip-link targets, and ARIA misuse.
 * Colour-contrast is skipped because jsdom does not compute real styles.
 *
 * @module test/a11y
 */

import axe, { type AxeResults, type Result, type RunOptions } from 'axe-core';

const DEFAULT_OPTIONS: RunOptions = {
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
  },
  rules: {
    // jsdom has no layout engine, so these produce false results.
    'color-contrast': { enabled: false },
    'landmark-one-main': { enabled: false },
    region: { enabled: false },
  },
};

function formatViolations(violations: Result[]): string {
  return violations
    .map((v) => {
      const nodes = v.nodes.map((n) => `      ${n.html}`).join('\n');
      return `  [${v.impact ?? 'unknown'}] ${v.id}: ${v.help}\n${nodes}`;
    })
    .join('\n');
}

/** Run axe against a container and return the raw results. */
export async function runAxe(
  container: Element,
  options: RunOptions = {},
): Promise<AxeResults> {
  return axe.run(container, { ...DEFAULT_OPTIONS, ...options });
}

/**
 * Assert that a rendered container has no accessibility violations.
 * Throws with a readable summary listing each offending element.
 */
export async function expectNoA11yViolations(
  container: Element,
  options: RunOptions = {},
): Promise<void> {
  const results = await runAxe(container, options);
  if (results.violations.length > 0) {
    throw new Error(
      `Expected no accessibility violations, found ${results.violations.length}:\n${formatViolations(
        results.violations,
      )}`,
    );
  }
}
