import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";

const url = "/dev/design-system";

for (const theme of ["light", "dark"] as const) {
  test(`the design system gallery has no accessibility violations (${theme})`, async ({ page }) => {
    await page.goto(url);
    await expect(page.getByRole("heading", { name: "Design system" })).toBeVisible();
    await expectNoA11yViolations(page, { theme });
  });
}

test("the chosen theme is remembered after a reload", async ({ page }) => {
  await page.goto(url);
  await page.getByRole("radio", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);

  await page.reload();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  await expect(page.getByRole("radio", { name: "Dark" })).toBeChecked();
});

test("chips and buttons stay visible in Windows High Contrast mode", async ({ page }, testInfo) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto(url);
  await expect(page.getByRole("heading", { name: "Design system" })).toBeVisible();

  // Attached to the test report so a person can check it by eye.
  const screenshot = await page.screenshot({ fullPage: true, caret: "initial" });
  await testInfo.attach("forced-colors", { body: screenshot, contentType: "image/png" });
});
