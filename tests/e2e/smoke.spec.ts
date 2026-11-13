import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";

for (const theme of ["light", "dark"] as const) {
  test(`the home page loads with no accessibility violations (${theme})`, async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "WestCal" })).toBeVisible();
    await expectNoA11yViolations(page, { theme });
  });
}
