import { expect, type Page, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import { signInAs } from "./sign-in";

// The pages shown instead of the calendar: not found and session ended (T34).

// Keeps the session cookie but makes it point at no session, as when it has run out.
async function endSession(page: Page) {
  const cookies = await page.context().cookies();
  const session = cookies.find((cookie) => cookie.name.endsWith("session_token"));
  if (!session) throw new Error("No session cookie to end.");
  await page.context().addCookies([{ ...session, value: "ended" }]);
}

for (const theme of ["light", "dark"] as const) {
  test(`an unknown address shows "Page not found" (${theme})`, async ({ page }) => {
    const response = await page.goto("/sign-in/nothing-here");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await expect(page).toHaveTitle("Page not found · WestCal");
    await expectNoA11yViolations(page, { theme });
  });
}

test("saving after the session has ended shows the sign-in-again page, which comes back", async ({
  page,
}) => {
  await signInAs(page, "Priya Shah");
  await page.goto("/?profile=me");
  const dialog = page.getByRole("dialog", { name: "My profile" });
  await dialog.getByRole("textbox", { name: /Preferred first name/ }).fill("Pri");

  await endSession(page);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { name: "Your session has ended" })).toBeVisible();
  // The calendar has gone completely before axe looks (it once caught the swap midway).
  await expect(page.getByRole("grid")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Sign in again" })).toBeVisible();
  await expectNoA11yViolations(page, { theme: "light" });

  await page.getByRole("link", { name: "Sign in again" }).click();
  await expect(page).toHaveURL("/sign-in?callbackURL=%2F%3Fprofile%3Dme");
  await page.getByRole("button", { name: "Developer sign-in" }).click();
  await page.getByRole("button", { name: "Sign in as Priya Shah" }).click();
  await expect(page).toHaveURL("/?profile=me");
  // The save never happened.
  await expect(dialog.getByRole("textbox", { name: /Preferred first name/ })).toHaveValue("");
});

test("a page loaded after the session has ended shows the sign-in-again page", async ({ page }) => {
  await signInAs(page, "Priya Shah");
  await endSession(page);
  await page.goto("/?view=month");
  await expect(page.getByRole("heading", { name: "Your session has ended" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in again" })).toHaveAttribute(
    "href",
    "/sign-in?callbackURL=%2F%3Fview%3Dmonth",
  );
});

test("a link opened while signed out comes back after signing in", async ({ page }) => {
  await page.goto("/?view=month");
  await expect(page).toHaveURL("/sign-in?callbackURL=%2F%3Fview%3Dmonth");
  await page.getByRole("button", { name: "Developer sign-in" }).click();
  await page.getByRole("button", { name: "Sign in as Priya Shah" }).click();
  await expect(page).toHaveURL("/?view=month");
});
