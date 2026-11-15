import { expect, test } from "@playwright/test";

// Until the grid exists (T16), the calendar page shows raw counts from getCalendarData.
test("the calendar loads its data for the date in the URL", async ({ page }) => {
  await page.goto("/dev-sign-in");
  await page.getByRole("button", { name: "Sign in as Tom Okafor" }).click();
  await expect(page).toHaveURL("/");

  // This week: the seed has bookings around today.
  const counts = page.getByText(/\d+ people, \d+ bookings/);
  await expect(counts).toBeVisible();
  const thisWeek = Number((await counts.textContent())?.match(/(\d+) bookings/)?.[1]);
  expect(thisWeek).toBeGreaterThan(0);

  // A week long before the seeded bookings: same people, no bookings.
  await page.goto("/?date=2024-06-12");
  await expect(page.getByText("West Operations, 2024-06-09 to 2024-06-15")).toBeVisible();
  await expect(page.getByText(/\d+ people, 0 bookings/)).toBeVisible();
});
