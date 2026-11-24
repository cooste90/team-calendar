import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "../a11y";
import { addLeave, dayCell, futureWeek, openWeek, typeDate } from "../grid-helpers";
import { signInAs, signInAsNewPerson } from "../sign-in";

// Axe in light and dark on the screens and states (accessibility §5) that the feature
// tests don't already check. docs/a11y-report.md lists where every screen is checked.

for (const [theme, weeksAhead] of [
  ["light", 50],
  ["dark", 51],
] as const) {
  test(`the accessibility statement, signed out (${theme})`, async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByRole("link", { name: "Accessibility statement" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Accessibility statement for WestCal" }),
    ).toBeVisible();
    await expectNoA11yViolations(page, { theme });
  });

  test(`the welcome page (${theme})`, async ({ page }) => {
    await page.goto("/dev-sign-in");
    await signInAsNewPerson(page, "Welcome");
    await expect(page.getByRole("heading", { name: "Choose your business unit" })).toBeVisible();
    // Next streams the title in just after a navigation, so wait for it.
    await expect(page).toHaveTitle("Choose your business unit · WestCal");
    await expectNoA11yViolations(page, { theme });
  });

  test(`the calendar in month view (${theme})`, async ({ page }) => {
    await signInAs(page, "Priya Shah");
    await page.goto("/?view=month");
    await expect(page.getByRole("grid", { name: /^Team calendar, / })).toBeVisible();
    await expectNoA11yViolations(page, { theme });
  });

  test(`the booking form showing a clash (${theme})`, async ({ page }) => {
    const week = futureWeek(weeksAhead);
    await signInAs(page, "Priya Shah");
    await openWeek(page, week.sunday);
    await addLeave(page, "Priya Shah", week.wednesday, week.wednesday);

    await dayCell(page, "Priya Shah", week.tuesday).click();
    await typeDate(page, "End date", week.wednesday);
    await page.getByRole("button", { name: "Add event", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("You already have Annual leave");
    await expectNoA11yViolations(page, { theme });
  });

  test(`the keyboard shortcuts (${theme})`, async ({ page }) => {
    await signInAs(page, "Priya Shah");
    await page.getByRole("link", { name: "Skip to calendar" }).focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("?");
    await expect(page.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeVisible();
    await expectNoA11yViolations(page, { theme });
  });
}
