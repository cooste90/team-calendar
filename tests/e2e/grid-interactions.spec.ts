import { expect, type Page, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import {
  addLeave,
  dayCell,
  daysFromToday,
  futureWeek,
  leaveBars,
  openWeek,
  typeDate,
  typed,
} from "./grid-helpers";
import { signInAs } from "./sign-in";

// Booking from the grid (spec §5.5, §5.6). Each test books in its own empty week far
// ahead (futureWeek), so the tests can't get in each other's way or the seed's.

const focused = (page: Page) => page.locator(":focus");

test("book leave over several days by clicking a day: it grows in, and stays after a reload", async ({
  page,
}) => {
  const week = futureWeek(30);
  await signInAs(page, "Priya Shah");
  await openWeek(page, week.sunday);
  await addLeave(page, "Priya Shah", week.tuesday, week.thursday);

  const bar = leaveBars(page, "Priya Shah");
  await expect(bar).toHaveClass(/animate-grow/);
  await expect(bar).not.toHaveClass(/animate-grow/); // only once
  await expect(bar).toHaveText(/^AL · [\d.]+ days?$/);
  // Focus is back on the day that was clicked.
  await expect(focused(page)).toHaveAttribute("data-column", week.tuesday);

  await page.reload();
  await expect(bar).toHaveText(/^AL · [\d.]+ days?$/);
});

test("a morning of annual leave and an afternoon of flexi leave share a day", async ({ page }) => {
  const week = futureWeek(31);
  await signInAs(page, "Priya Shah");
  await openWeek(page, week.sunday);

  await dayCell(page, "Priya Shah", week.wednesday).click();
  await page.getByRole("radio", { name: "Morning (AM)" }).click();
  await page.getByRole("button", { name: "Add event", exact: true }).click();
  await expect(leaveBars(page, "Priya Shah")).toHaveCount(1);

  // The day has a booking now, so it opens the cell menu, which offers the afternoon.
  await dayCell(page, "Priya Shah", week.wednesday).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Add to afternoon" }).click();
  await page.getByRole("radio", { name: "FL Flexi leave" }).click();
  await page.getByRole("button", { name: "Add event", exact: true }).click();

  const halves = leaveBars(page, "Priya Shah");
  await expect(halves).toHaveText(["AL", "FL"]);
  await expect(halves.first()).toHaveAttribute("data-half", "true");
  await expect(halves.last()).toHaveAttribute("data-half", "true");
});

test("a clash is shown, and Replace makes room for the new booking", async ({ page }) => {
  const week = futureWeek(32);
  await signInAs(page, "Priya Shah");
  await openWeek(page, week.sunday);
  await addLeave(page, "Priya Shah", week.wednesday, week.thursday);

  await dayCell(page, "Priya Shah", week.tuesday).click();
  await typeDate(page, "End date", week.wednesday);
  await page.getByRole("button", { name: "Add event", exact: true }).click();
  const alert = page.getByRole("alert");
  await expect(alert).toContainText("You already have Annual leave");
  await alert.getByRole("button", { name: "Replace it" }).click();

  // The new booking (Tuesday and Wednesday) and what's left of the old one (Thursday).
  await expect(page.getByRole("dialog", { name: "Add event" })).toHaveCount(0);
  await expect(leaveBars(page, "Priya Shah")).toHaveCount(2);
  await expect(leaveBars(page, "Priya Shah").last()).toHaveText("AL");
});

// Owen is Unassigned, so the seed gave him no bookings, and only this test books for him.
// Tom, an admin, can add bookings up to 7 days back, so he can make one that has started.
test("an admin moves the end of a booking that has already started", async ({ page }) => {
  const yesterday = daysFromToday(-1);
  const later = daysFromToday(4);
  await signInAs(page, "Tom Okafor");
  await openWeek(page, yesterday);
  await addLeave(page, "Owen Hughes", yesterday, daysFromToday(1));

  await leaveBars(page, "Owen Hughes").click();
  await page
    .getByRole("dialog", { name: "Annual leave, Owen Hughes" })
    .getByRole("button", {
      name: "Edit",
    })
    .click();
  const form = page.getByRole("dialog", { name: "Edit event" });
  await expect(form).toContainText("Started in the past — only the end date and notes can change.");
  await typeDate(page, "End date", later);
  await form.getByRole("button", { name: "Save changes" }).click();
  await expect(form).toHaveCount(0);

  await openWeek(page, later);
  await expect(dayCell(page, "Owen Hughes", later)).toHaveAttribute("aria-label", /Annual leave/);
});

test("Remove this day takes a day out of the middle, leaving two bookings", async ({ page }) => {
  const week = futureWeek(33);
  await signInAs(page, "Priya Shah");
  await openWeek(page, week.sunday);
  await addLeave(page, "Priya Shah", week.tuesday, week.thursday);

  // The middle of a Tuesday-to-Thursday bar is over Wednesday.
  await leaveBars(page, "Priya Shah").click();
  await page.getByRole("button", { name: /^Remove this day/ }).click();
  await expect(leaveBars(page, "Priya Shah")).toHaveText(["AL", "AL"]);
  await expect(dayCell(page, "Priya Shah", week.wednesday)).not.toHaveAttribute(
    "aria-label",
    /Annual leave/,
  );
});

test("a deleted booking comes back with Undo", async ({ page }) => {
  const week = futureWeek(34);
  await signInAs(page, "Priya Shah");
  await openWeek(page, week.sunday);
  await addLeave(page, "Priya Shah", week.wednesday, week.wednesday);

  await leaveBars(page, "Priya Shah").click();
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(leaveBars(page, "Priya Shah")).toHaveCount(0);
  await expect(page.getByText("Booking deleted", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(leaveBars(page, "Priya Shah")).toHaveCount(1);
});

test("keyboard only: book, look at it, close it, then delete it", async ({ page }) => {
  const week = futureWeek(35);
  await signInAs(page, "Priya Shah");
  await openWeek(page, week.sunday);

  // Into the grid, then to Priya's Tuesday.
  await page.getByRole("link", { name: "Skip to calendar" }).focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(focused(page)).toHaveAttribute("data-column", week.tuesday);

  // Enter on the empty day opens Add event. (focus() jumps straight to a field, as Tab
  // would after a few presses.)
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Add event" })).toBeVisible();
  await page.getByRole("textbox", { name: "End date" }).focus();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type(typed(week.thursday));
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Add event", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Add event" })).toHaveCount(0);
  await expect(focused(page)).toHaveAttribute("data-column", week.tuesday);
  await expect(leaveBars(page, "Priya Shah")).toHaveCount(1);

  // Enter now opens the cell menu; View shows the details; Esc goes back to the day.
  await page.keyboard.press("Enter");
  await expect(focused(page)).toHaveAccessibleName("View Annual leave");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Annual leave, Priya Shah" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(focused(page)).toHaveAttribute("data-column", week.tuesday);

  // Delete asks first, because it's more than one day.
  await page.keyboard.press("Delete");
  const confirm = page.getByRole("alertdialog", { name: /^Delete Annual leave, / });
  await expect(confirm).toBeVisible();
  await page.keyboard.press("Tab"); // from Cancel to Delete
  await page.keyboard.press("Enter");
  await expect(leaveBars(page, "Priya Shah")).toHaveCount(0);
  await expect(focused(page)).toHaveAttribute("data-column", week.tuesday);
});

test("you can book for a teammate, but only look at another team's days", async ({ page }) => {
  const week = futureWeek(36);
  await signInAs(page, "Priya Shah");
  await openWeek(page, week.sunday);
  // Priya's own team comes first.
  const teams = page.getByRole("grid").getByRole("rowgroup");
  const teammate = teams.first().getByRole("rowheader").filter({ hasNotText: "Priya Shah" });
  const teammateName = (await teammate.first().textContent()) ?? "";
  const otherName = (await teams.nth(1).getByRole("rowheader").first().textContent()) ?? "";

  await dayCell(page, teammateName, week.wednesday).click();
  await expect(page.getByRole("dialog", { name: "Add event" })).toBeVisible();
  await page.keyboard.press("Escape");

  await dayCell(page, otherName, week.wednesday).click();
  const menu = page.getByRole("dialog", { name: new RegExp(`, ${otherName}$`) });
  await expect(menu).toContainText("Nothing booked.");
  await expect(menu.getByRole("button")).toHaveCount(0);

  // Another team's booking shows its details, with nothing to change.
  await page.keyboard.press("Escape");
  await page.goto("/?view=month");
  await teams.nth(1).locator("[data-booking]:not([data-half])").first().click();
  const details = page.getByRole("dialog");
  await expect(details).toContainText("Created by");
  await expect(details.getByRole("button")).toHaveCount(0);
});

test("someone else's new booking shows up when you come back to the tab", async ({
  page,
  browser,
}, testInfo) => {
  const week = futureWeek(37);
  const tomsContext = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
  const tomsPage = await tomsContext.newPage();
  await signInAs(tomsPage, "Tom Okafor");
  await openWeek(tomsPage, week.sunday);

  await signInAs(page, "Priya Shah");
  await openWeek(page, week.sunday);
  await addLeave(page, "Priya Shah", week.wednesday, week.wednesday);

  const whatTomSees = leaveBars(tomsPage, "Priya Shah");
  await expect(whatTomSees).toHaveCount(0);
  await tomsPage.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(whatTomSees).toHaveCount(1);
  await tomsContext.close();
});

for (const [theme, weeksAhead] of [
  ["light", 38],
  ["dark", 39],
] as const) {
  test(`the cell menu, details and delete confirmation have no accessibility violations (${theme})`, async ({
    page,
  }) => {
    const week = futureWeek(weeksAhead);
    await signInAs(page, "Priya Shah");
    await openWeek(page, week.sunday);
    await addLeave(page, "Priya Shah", week.tuesday, week.thursday);

    await dayCell(page, "Priya Shah", week.tuesday).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: /, Priya Shah$/ })).toBeVisible();
    await expectNoA11yViolations(page, { theme });

    await page.keyboard.press("Enter"); // View
    await expect(page.getByRole("dialog", { name: "Annual leave, Priya Shah" })).toBeVisible();
    await expectNoA11yViolations(page, { theme });

    await page.keyboard.press("Escape");
    await page.keyboard.press("Delete");
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await expectNoA11yViolations(page, { theme });
  });
}
