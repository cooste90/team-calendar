import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

// The WCAG 2.2 AA rule set we promise to meet (docs/plan/03-accessibility.md).
const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

// Checks the current page in the given colour scheme and fails with the list of problems.
export async function expectNoA11yViolations(page: Page, { theme }: { theme: "light" | "dark" }) {
  await page.emulateMedia({ colorScheme: theme });
  const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
  expect(results.violations).toEqual([]);
}
