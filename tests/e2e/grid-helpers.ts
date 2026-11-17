import { expect, type Page } from "@playwright/test";
import { addDays, startOfWeek, todayIn } from "@/domain/dates";

// A date some days from today, in London like the app, as "YYYY-MM-DD".
export function daysFromToday(days: number) {
  return addDays(todayIn("Europe/London"), days);
}

// The days of a week far enough ahead that the seed has booked nothing in it (it books up
// to six months ahead). Each test uses its own week, so tests running side by side can't
// clash.
export function futureWeek(weeksAhead: number) {
  const sunday = startOfWeek(daysFromToday(weeksAhead * 7));
  return {
    sunday,
    tuesday: addDays(sunday, 2),
    wednesday: addDays(sunday, 3),
    thursday: addDays(sunday, 4),
  };
}

// "22/06/2027": a date as someone types it into the booking form.
export function typed(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

export async function openWeek(page: Page, date: string) {
  await page.goto(`/?view=week&date=${date}`);
  await expect(page.getByRole("grid")).toBeVisible();
}

// A person's row on the grid, and their cell for one date.
export function personRow(page: Page, name: string) {
  const header = page.getByRole("rowheader", { name: new RegExp(`^${name}`) });
  return page.getByRole("row").filter({ has: header });
}

export function dayCell(page: Page, name: string, date: string) {
  return personRow(page, name).locator(`[role="gridcell"][data-column="${date}"]`);
}

// A person's booking bars, leaving out public holidays, which can fall in any week.
export function leaveBars(page: Page, name: string) {
  return personRow(page, name).locator("[data-booking]").filter({ hasNotText: /^PH/ });
}

// Types a date into one of the booking form's date fields.
export async function typeDate(page: Page, field: "Start date" | "End date", date: string) {
  const input = page.getByRole("textbox", { name: field });
  await input.fill(typed(date));
  await input.press("Enter");
}

// Books annual leave from an empty day: click it, set the end date, Add event.
export async function addLeave(page: Page, name: string, startDate: string, endDate: string) {
  await dayCell(page, name, startDate).click();
  const dialog = page.getByRole("dialog", { name: "Add event" });
  await expect(dialog).toBeVisible();
  if (endDate !== startDate) await typeDate(page, "End date", endDate);
  await dialog.getByRole("button", { name: "Add event", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  // Wait for the refreshed data, so the next click sees the new booking.
  await expect(dayCell(page, name, startDate)).toHaveAttribute("aria-label", /Annual leave/);
}
