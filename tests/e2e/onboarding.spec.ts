import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import { signInAsNewPerson } from "./sign-in";

// The seed has three BUs, so a first-time user has to choose one (spec §1.3).

test("a new person who didn't choose a BU picks one on the welcome page", async ({ page }) => {
  await page.goto("/dev-sign-in");
  await signInAsNewPerson(page);

  await expect(page).toHaveURL("/welcome");
  await expect(page.getByRole("heading", { name: "Choose your business unit" })).toBeVisible();
  await expectNoA11yViolations(page, { theme: "light" });

  await page.getByRole("radio", { name: "North Finance" }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByText("North Finance · all teams · all people")).toBeVisible();
});

test("a BU chosen on the sign-in page is used for a new person", async ({ page }) => {
  await page.goto("/sign-in");
  await page
    .getByLabel("First time here? Which business unit do you belong to?")
    .selectOption({ label: "North Finance" });
  await page.getByRole("button", { name: "Developer sign-in" }).click();
  await expect(page).toHaveURL("/dev-sign-in");

  await signInAsNewPerson(page);
  await expect(page).toHaveURL("/");
});

for (const theme of ["light", "dark"] as const) {
  test(`the sign-in page with the BU choice has no accessibility violations (${theme})`, async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await expect(
      page.getByLabel("First time here? Which business unit do you belong to?"),
    ).toBeVisible();
    await expectNoA11yViolations(page, { theme });
  });
}
