import { expect, test } from "@playwright/test";
import { signInAs, signOut } from "./sign-in";

// Tom Okafor is the seeded West Operations admin (dev profile in the CALENDAR_ADMIN group).

test("an admin signs in on the dev page, lands on the calendar, then signs out", async ({
  page,
}) => {
  await signInAs(page, "Tom Okafor");
  await expect(page).toHaveURL("/");

  await signOut(page);

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
