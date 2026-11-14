import { expect, type Page, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import { ensureBusinessUnits } from "./test-db";

// With two BUs, a first-time user has to choose one (spec §1.3).
test.beforeAll(async () => {
  await ensureBusinessUnits("Finance", "Operations");
});

// Signs in on the dev page as someone who has never signed in before.
async function signInAsNewPerson(page: Page) {
  const id = `e2e-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  await page.getByLabel("SSO ID").fill(id);
  await page.getByLabel("Employee number").fill(id);
  await page.getByLabel("First name").fill("New");
  await page.getByLabel("Surname").fill("Starter");
  await page.getByLabel("Email").fill(`${id}@example.com`);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

test("a new person who didn't choose a BU picks one on the welcome page", async ({ page }) => {
  await page.goto("/dev-sign-in");
  await signInAsNewPerson(page);

  await expect(page).toHaveURL("/welcome");
  await expect(page.getByRole("heading", { name: "Choose your business unit" })).toBeVisible();
  await expectNoA11yViolations(page, { theme: "light" });

  await page.getByRole("radio", { name: "Operations" }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "WestCal" })).toBeVisible();
});

test("a BU chosen on the sign-in page is used for a new person", async ({ page }) => {
  await page.goto("/sign-in");
  await page
    .getByLabel("First time here? Which business unit do you belong to?")
    .selectOption({ label: "Operations" });
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
