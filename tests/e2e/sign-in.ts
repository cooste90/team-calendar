import { expect, type Page } from "@playwright/test";

// Signs in on the dev sign-in page as one of the seeded people, e.g. "Tom Okafor"
// (prisma/seed/dev-sso-profiles.ts), and waits for the calendar.
export async function signInAs(page: Page, name: string) {
  await page.goto("/dev-sign-in");
  await page.getByRole("button", { name: `Sign in as ${name}` }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}
