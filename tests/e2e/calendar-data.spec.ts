import { expect, test } from "@playwright/test";
import { signInAs } from "./sign-in";

// Bars are hidden from screen readers but carry a title with the full description.
const BARS = "[role=grid] div[aria-hidden=true][title]";

test("the calendar loads its data for the date in the URL", async ({ page }) => {
  await signInAs(page, "Tom Okafor");

  // This week: the seed has bookings around today.
  await expect(page.locator(BARS).first()).toBeVisible();

  // A week long before the seeded bookings: the same people, but no bookings.
  await page.goto("/?date=2024-06-12");
  await expect(page.getByRole("heading", { level: 1, name: "9 – 15 June 2024" })).toBeVisible();
  await expect(page.getByRole("rowheader", { name: /Tom Okafor/ })).toBeVisible();
  await expect(page.locator(BARS)).toHaveCount(0);
});
