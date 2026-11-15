import { expect, test } from "@playwright/test";
import { signInAs } from "./sign-in";

// Until the grid exists (T16), the calendar page shows raw counts from getCalendarData.
test("the calendar loads its data for the date in the URL", async ({ page }) => {
  await signInAs(page, "Tom Okafor");

  // This week: the seed has bookings around today.
  const counts = page.getByText(/\d+ people, \d+ bookings/);
  await expect(counts).toBeVisible();
  const thisWeek = Number((await counts.textContent())?.match(/(\d+) bookings/)?.[1]);
  expect(thisWeek).toBeGreaterThan(0);

  // A week long before the seeded bookings: same people, no bookings.
  await page.goto("/?date=2024-06-12");
  await expect(page.getByRole("heading", { level: 1, name: "9 – 15 June 2024" })).toBeVisible();
  await expect(page.getByText(/\d+ people, 0 bookings/)).toBeVisible();
});
