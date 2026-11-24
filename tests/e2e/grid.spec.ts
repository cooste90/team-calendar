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

test("a month wider than the window opens on today, and Today scrolls back to it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 600, height: 800 });
  await signInAs(page, "Priya Shah");
  await page.goto("/?view=month");
  const today = page.getByRole("grid").locator("[role=columnheader][data-today]");
  await expect(today).toBeInViewport();

  // Scrolled to the far end of the same month, Today scrolls back.
  await page.getByRole("region", { name: "Calendar" }).evaluate((box) => {
    const header = box.querySelector<HTMLElement>("[data-today]");
    const todayInFirstHalf = (header?.offsetLeft ?? 0) < box.scrollWidth / 2;
    box.scrollLeft = todayInFirstHalf ? box.scrollWidth : 0;
  });
  await expect(today).not.toBeInViewport();
  await page.getByRole("button", { name: "Today" }).click();
  await expect(today).toBeInViewport();

  // From another month, Today comes back to it too.
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(today).toHaveCount(0);
  await page.getByRole("button", { name: "Today" }).click();
  await expect(today).toBeInViewport();
});
