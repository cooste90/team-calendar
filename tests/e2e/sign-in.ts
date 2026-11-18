import { expect, type Page } from "@playwright/test";

// Signs in on the dev sign-in page as one of the seeded people, e.g. "Tom Okafor"
// (prisma/seed/dev-sso-profiles.ts), and waits for the calendar.
export async function signInAs(page: Page, name: string) {
  await page.goto("/dev-sign-in");
  await page.getByRole("button", { name: `Sign in as ${name}` }).click();
  // Generous: the first test to reach the calendar waits for the dev server to compile it.
  await expect(page.getByRole("button", { name: `User menu for ${name}` })).toBeVisible({
    timeout: 30_000,
  });
}

// Signs out through the user menu.
export async function signOut(page: Page) {
  await page.getByRole("button", { name: /^User menu for / }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/sign-in");
}
