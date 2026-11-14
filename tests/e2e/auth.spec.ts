import { expect, test } from "@playwright/test";
import pg from "pg";

// Tom Okafor is the dev profile in the CALENDAR_ADMIN group. As a new user he joins
// his profile's BU, "Finance", so make sure it exists. (The seed does this from T13.)
test.beforeAll(async () => {
  const client = new pg.Client(process.env.DATABASE_URL_TEST);
  await client.connect();
  await client.query(
    `INSERT INTO "BusinessUnit" (id, name, slug, "updatedAt")
     VALUES (gen_random_uuid()::text, 'Finance', 'finance', now())
     ON CONFLICT DO NOTHING`,
  );
  await client.end();
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
