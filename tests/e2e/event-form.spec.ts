import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import { dayCell, futureWeek, leaveBars, openWeek } from "./grid-helpers";
import { signInAs } from "./sign-in";

// The booking form, opened from the calendar. Each test uses its own empty week far
// ahead, as in grid-interactions.spec.ts.

for (const [theme, weeksAhead] of [
  ["light", 40],
  ["dark", 41],
] as const) {
  test(`the booking form has no accessibility violations (${theme})`, async ({ page }) => {
    const week = futureWeek(weeksAhead);
    await signInAs(page, "Priya Shah");
    await openWeek(page, week.sunday);

    await dayCell(page, "Priya Shah", week.wednesday).click();
    const addForm = page.getByRole("dialog", { name: "Add event" });
    await expect(addForm).toBeVisible();
    await expectNoA11yViolations(page, { theme });

    // Save it, then edit it from its details.
    await addForm.getByRole("button", { name: "Add event", exact: true }).click();
    await leaveBars(page, "Priya Shah").click();
    await page.getByRole("button", { name: "Edit" }).click();
    await expect(page.getByRole("dialog", { name: "Edit event" })).toBeVisible();
    await expectNoA11yViolations(page, { theme });
  });
}

test("the arrow keys choose a leave type", async ({ page }) => {
  const week = futureWeek(42);
  await signInAs(page, "Priya Shah");
  await openWeek(page, week.sunday);
  await dayCell(page, "Priya Shah", week.wednesday).click();
  await page.getByRole("radio", { name: "AL Annual leave" }).focus();
  // Radix picks the type the arrow lands on while the key is still held, which a person's
  // key press always is. keyboard.press() lets go too quickly, so hold it until it's picked.
  await page.keyboard.down("ArrowRight");
  await expect(page.getByRole("radio", { name: "FL Flexi leave" })).toBeChecked();
  await page.keyboard.up("ArrowRight");
});

test("on a phone-sized screen it fills the screen and the buttons stay in view", async ({
  page,
}) => {
  const week = futureWeek(43);
  await signInAs(page, "Priya Shah");
  await openWeek(page, week.sunday);
  // Opened at desktop size, where the day is easy to reach, then the screen shrinks.
  await dayCell(page, "Priya Shah", week.wednesday).click();
  await page.setViewportSize({ width: 320, height: 640 });

  const dialog = page.getByRole("dialog", { name: "Add event" });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("button", { name: "Add event", exact: true })).toBeInViewport();
  await expect.poll(async () => (await dialog.boundingBox())?.width).toBe(320);
  await expectNoA11yViolations(page, { theme: "light" });
});
