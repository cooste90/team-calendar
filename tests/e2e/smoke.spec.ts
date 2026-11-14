import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";

const pages = [
  { url: "/sign-in", heading: "Sign in to WestCal" },
  { url: "/dev-sign-in", heading: "Developer sign-in" },
];

for (const { url, heading } of pages) {
  for (const theme of ["light", "dark"] as const) {
    test(`${url} loads with no accessibility violations (${theme})`, async ({ page }) => {
      await page.goto(url);
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
      await expectNoA11yViolations(page, { theme });
    });
  }
}
