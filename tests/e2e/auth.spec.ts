import { expect, test } from "@playwright/test";
import { ensureBusinessUnits } from "./test-db";

// Tom Okafor is the dev profile in the CALENDAR_ADMIN group. As a new user he joins
// his profile's BU, "Finance", so make sure it exists.
test.beforeAll(async () => {
  await ensureBusinessUnits("Finance");
});

test("an admin signs in on the dev page, lands on the calendar, then signs out", async ({
  page,
}) => {
  await page.goto("/dev-sign-in");
  await page.getByRole("button", { name: "Sign in as Tom Okafor" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "WestCal" })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/sign-in");

  // The session is really gone, not just the page.
  await page.goto("/");
  await expect(page).toHaveURL("/sign-in");
});

test("app pages and data can't be reached without a session", async ({ page, request }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/sign-in");

  const response = await request.get("/api/export/attendance", { maxRedirects: 0 });
  expect(response.status()).toBe(401);
});
