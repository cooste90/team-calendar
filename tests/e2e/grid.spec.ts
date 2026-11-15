import { expect, test } from "@playwright/test";
import { signInAs } from "./sign-in";

test("the grid shows this week with today highlighted, then the month with bars", async ({
  page,
}, testInfo) => {
  await signInAs(page, "Priya Shah");
  const grid = page.getByRole("grid");

  // The current week: 7 days, today marked, Priya's own row highlighted.
  await expect(grid.locator("[role=columnheader][data-today]")).toHaveCount(1);
  await expect(grid.locator("[role=columnheader]")).toHaveCount(8); // "Team / person" + 7 days
  await expect(grid.locator("[role=row][data-viewer]")).toContainText("Priya Shah");

  await page.getByRole("radio", { name: "Month" }).click();
  await expect(page).toHaveURL(/view=month/);
  await expect(grid.locator("[role=columnheader]").nth(28)).toBeVisible(); // at least 28 days
  // Bars are hidden from screen readers but carry a title with the full description.
  await expect(grid.locator("div[aria-hidden=true][title]").first()).toBeVisible();

  // Screenshots in both themes, to compare by eye with the mockup.
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${theme}\\b`));
    const screenshot = await page.screenshot({ fullPage: true });
    await testInfo.attach(`month-${theme}`, { body: screenshot, contentType: "image/png" });
  }
});
