import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import { signInAs } from "./sign-in";

test("the theme chosen in the user menu is still there after a reload", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await signInAs(page, "Priya Shah");
  const userMenu = page.getByRole("button", { name: "User menu for Priya Shah" });

  await userMenu.click();
  // A regular user gets no role label.
  await expect(page.getByText("West Operations · Service Design", { exact: true })).toBeVisible();
  await page.getByRole("menuitemradio", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);

  await page.reload();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  await userMenu.click();
  await expect(page.getByRole("menuitemradio", { name: "Dark" })).toBeChecked();
});

test("an admin's menu shows their role and the Admin item", async ({ page }) => {
  await signInAs(page, "Tom Okafor");
  await page.getByRole("button", { name: "User menu for Tom Okafor" }).click();
  await expect(page.getByRole("menu")).toContainText("West Operations ·");
  await expect(page.getByRole("menu")).toContainText("· Admin");

  await page.getByRole("menuitem", { name: "Admin" }).click();
  await expect(page).toHaveURL(/admin=teams/);
});

for (const theme of ["light", "dark"] as const) {
  test(`the open user menu has no accessibility violations (${theme})`, async ({ page }) => {
    await signInAs(page, "Tom Okafor");
    await page.getByRole("button", { name: "User menu for Tom Okafor" }).click();
    await expect(page.getByRole("menu")).toBeVisible();
    await expectNoA11yViolations(page, { theme });
  });
}
