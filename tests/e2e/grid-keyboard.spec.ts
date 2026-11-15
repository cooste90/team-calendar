import { expect, type Page, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import { signInAs } from "./sign-in";

// The accessible name of whatever has focus, e.g. "Friday 20 November, Grace Adeyemi."
function focusedName(page: Page) {
  return page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? "");
}

test("keyboard only: skip link, into the grid, arrows, Page Down, then Tab out", async ({
  page,
}) => {
  await signInAs(page, "Priya Shah");

  // The skip link lands on Priya's cell for today. (It's the first Tab stop in production;
  // in dev, Next's dev tools button comes first, so the test starts on the link.)
  await page.getByRole("link", { name: "Skip to calendar" }).focus();
  await page.keyboard.press("Enter");
  expect(await focusedName(page)).toMatch(/, Priya Shah[.,]/);
  await expect(page.locator(":focus")).toHaveAttribute("data-today", "true");

  // Sunday, then five days on to Friday, then up to a teammate (Priya is last in her
  // team, sorted by surname).
  await page.keyboard.press("Home");
  for (let step = 0; step < 5; step++) await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowUp");
  const teammateFriday = await focusedName(page);
  expect(teammateFriday).toMatch(/^Friday \d+ \w+, /);
  expect(teammateFriday).not.toContain("Priya Shah");

  // Page Down: the next week, still on the same person, on a Friday.
  const teammate = teammateFriday.split(", ")[1].replace(/\.$/, "");
  await page.keyboard.press("PageDown");
  await expect(page).toHaveURL(/date=\d{4}-\d{2}-\d{2}/);
  await expect.poll(() => focusedName(page)).not.toBe(teammateFriday);
  expect(await focusedName(page)).toMatch(new RegExp(`^Friday \\d+ \\w+, ${teammate}`));

  // Tab leaves the cell: the next stop is the following team's collapse button.
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveAttribute("aria-expanded", "true");
});

test("? opens the keyboard shortcuts, and Esc puts focus back on the cell", async ({ page }) => {
  await signInAs(page, "Priya Shah");
  await page.getByRole("link", { name: "Skip to calendar" }).focus();
  await page.keyboard.press("Enter");
  const cellName = await focusedName(page);

  await page.keyboard.press("?");
  const dialog = page.getByRole("dialog", { name: "Keyboard shortcuts" });
  await expect(dialog).toBeVisible();
  await expectNoA11yViolations(page, { theme: "light" });

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  expect(await focusedName(page)).toBe(cellName);
});
