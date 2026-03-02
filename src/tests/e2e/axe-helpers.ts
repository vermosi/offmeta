import AxeBuilder from '@axe-core/playwright';
import type { Page, TestInfo } from '@playwright/test';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

interface AxeAuditOptions {
  scope?: string;
  context?: string;
}

export async function runAxeAudit(
  page: Page,
  testInfo: TestInfo,
  options: AxeAuditOptions = {},
) {
  const { scope, context = 'a11y-audit' } = options;

  const builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
  if (scope) {
    builder.include(scope);
  }

  const results = await builder.analyze();

  const blockingViolations = results.violations.filter(
    (violation) =>
      violation.impact === 'critical' || violation.impact === 'serious',
  );

  const moderateViolations = results.violations.filter(
    (violation) => violation.impact === 'moderate',
  );

  if (moderateViolations.length > 0) {
    await testInfo.attach(`${context}-moderate-violations.json`, {
      body: JSON.stringify(
        {
          url: page.url(),
          count: moderateViolations.length,
          violations: moderateViolations.map((violation) => ({
            id: violation.id,
            impact: violation.impact,
            description: violation.description,
            help: violation.help,
            helpUrl: violation.helpUrl,
            nodes: violation.nodes.length,
          })),
        },
        null,
        2,
      ),
      contentType: 'application/json',
    });

    // eslint-disable-next-line no-console
    console.warn(
      `[${context}] Moderate accessibility violations: ${moderateViolations.length}`,
    );
  }

  if (blockingViolations.length > 0) {
    const summary = blockingViolations
      .map(
        (violation) =>
          `[${violation.impact}] ${violation.id}: ${violation.description} (${violation.nodes.length} nodes)`,
      )
      .join('\n');

    // eslint-disable-next-line no-console
    console.error(
      `[${context}] Blocking accessibility violations:\n${summary}`,
    );
  }

  return { blockingViolations, moderateViolations };
}
