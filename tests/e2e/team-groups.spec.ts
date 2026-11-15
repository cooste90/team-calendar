import { expect, type Page, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import { signInAs } from "./sign-in";

// Resolves once a server action (a POST to the page) has finished.
function serverActionDone(page: Page) {
  return page.waitForResponse((response) => response.request().method() === "POST");
}

// Ana isn't used by any other spec, so collapsing her team can't affect them.
test("a collapsed team stays collapsed after a reload", async ({ page }) => {
  await signInAs(page, "Ana Kowalska");
  const grid = page.getByRole("grid");
  const team = grid.getByRole("button", { name: /^Communications, \d+ people, your team$/ });
  await expect(team).toHaveAttribute("aria-expanded", "true");
  await expect(grid.getByRole("rowheader", { name: /Ana Kowalska/ })).toBeVisible();

  const saved = serverActionDone(page);
  await team.click();
  await expect(team).toHaveAttribute("aria-expanded", "false");
  await expect(grid.getByRole("rowheader", { name: /Ana Kowalska/ })).toHaveCount(0);
  await saved;

  await page.reload();
  await expect(team).toHaveAttribute("aria-expanded", "false");
  await expect(grid.getByRole("rowheader", { name: /Ana Kowalska/ })).toHaveCount(0);
});

test("an admin sees the Unassigned group last and can click names", async ({ page }) => {
  await signInAs(page, "Tom Okafor");
  const grid = page.getByRole("grid");
  const groups = grid.getByRole("button", { expanded: true });
  await expect(groups.first()).toHaveAccessibleName(/^Finance Operations, .*your team$/);
  await expect(groups.last()).toHaveAccessibleName(/^Unassigned, .*visible to admins only$/);

  // Until T27 builds the profile dialog, the link only sets ?person= in the URL.
  await grid.getByRole("link", { name: "Owen Hughes" }).click();
  await expect(page).toHaveURL(/person=/);
});

test("a regular user sees neither the Unassigned group nor name links", async ({ page }) => {
  await signInAs(page, "Priya Shah");
  const grid = page.getByRole("grid");
  await expect(grid.getByRole("button", { name: /^Service Design/ })).toBeVisible();
  await expect(grid.getByRole("button", { name: /^Unassigned/ })).toHaveCount(0);
  await expect(grid.getByRole("link")).toHaveCount(0);
});

test("an unassigned user sees the banner, without their own row, until they close it", async ({
  page,
}) => {
  await signInAs(page, "Owen Hughes");
  const banner = page.getByText("An admin needs to add you to a team before you can book.");
  await expect(banner).toBeVisible();
  await expect(page.getByRole("rowheader", { name: /Owen Hughes/ })).toHaveCount(0);
  await expectNoA11yViolations(page, { theme: "light" });

  const saved = serverActionDone(page);
  await page.getByRole("button", { name: "Dismiss" }).click();
  await expect(banner).toHaveCount(0);
  await saved;

  // Gone for the rest of the browser session.
  await page.reload();
  await expect(page.getByRole("grid")).toBeVisible();
  await expect(banner).toHaveCount(0);
});
