import { expect, type Page, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import { signInAs, signOut } from "./sign-in";

// The admin dialog's Teams tab. These tests change Corporate Services' teams as Callum
// Reid, its admin. They only touch Records Management (the last team) and a team they
// add, so the profile tests, which use Callum's own team (Legal), don't notice.

// The team groups on the grid, top to bottom, by name: ["Legal", …, "Unassigned"].
async function gridTeamOrder(page: Page) {
  const labels = await page
    .getByRole("grid")
    .locator("button[aria-controls]")
    .evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-label") ?? ""));
  return labels.map((label) => label.split(",")[0]);
}

// How many people a team group on the grid has, from its label ("Legal, 9 people, …").
async function groupSize(page: Page, name: string) {
  const label = await page
    .getByRole("grid")
    .getByRole("button", { name: new RegExp(`^${name},`) })
    .getAttribute("aria-label");
  return Number(label?.match(/, (\d+) (person|people)/)?.[1]);
}

async function openAdmin(page: Page) {
  await page.getByRole("button", { name: /^User menu for / }).click();
  await page.getByRole("menuitem", { name: "Admin" }).click();
}

test("an admin adds, renames, reorders and deletes teams, and the grid follows", async ({
  page,
}) => {
  await signInAs(page, "Callum Reid");
  const recordsSize = await groupSize(page, "Records Management");
  const unassignedSize = await groupSize(page, "Unassigned");

  await openAdmin(page);
  const dialog = page.getByRole("dialog", { name: "Admin · Corporate Services" });
  await expect(page).toHaveURL(/admin=teams/);
  await expect(page).toHaveTitle("Admin · Corporate Services · WestCal");
  const status = dialog.getByRole("status");

  // A new team goes at the end.
  await dialog.getByRole("textbox", { name: "New team" }).fill("Quality");
  await dialog.getByRole("button", { name: "Add team" }).click();
  await expect(status).toHaveText("Quality added at the end of the list.");
  await expect(dialog.getByRole("listitem").last()).toContainText("Quality");

  await dialog.getByRole("button", { name: "Rename Quality" }).click();
  await dialog.getByRole("textbox", { name: "New name for Quality" }).fill("Quality & Audit");
  await page.keyboard.press("Enter");
  await expect(status).toHaveText("Quality renamed to Quality & Audit.");

  // Up one place, above Records Management, from the keyboard.
  const moveUp = dialog.getByRole("button", { name: "Move Quality & Audit up" });
  await moveUp.focus();
  await page.keyboard.press("Enter");
  await expect(status).toHaveText("Quality & Audit moved to position 8 of 9.");
  await expect(moveUp).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page).not.toHaveURL(/admin=/);
  await expect
    .poll(async () => (await gridTeamOrder(page)).slice(-3))
    .toEqual(["Quality & Audit", "Records Management", "Unassigned"]);

  // Deleting a team moves its people to Unassigned.
  await openAdmin(page);
  await dialog.getByRole("button", { name: "Delete Records Management" }).click();
  const confirm = page.getByRole("alertdialog", { name: "Delete Records Management?" });
  await expect(confirm).toHaveAccessibleDescription(
    new RegExp(`^Its ${recordsSize} members? will move to Unassigned\\.$`),
  );
  await confirm.getByRole("button", { name: "Delete team" }).click();
  await expect(confirm).toBeHidden();
  await expect(status).toHaveText(/^Records Management deleted\./);
  await expect(dialog.getByRole("textbox", { name: "New team" })).toBeFocused();

  await page.keyboard.press("Escape");
  await expect.poll(() => groupSize(page, "Unassigned")).toBe(unassignedSize + recordsSize);
  expect(await gridTeamOrder(page)).not.toContain("Records Management");
});

test("an admin of another BU gets no dialog; a super admin can switch BU", async ({ page }) => {
  await signInAs(page, "Tom Okafor");
  await page.goto("/?bu=north-finance&admin=teams");
  await expect(page.getByRole("grid")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await signOut(page);
  await signInAs(page, "Grace Adeyemi");
  await page.goto("/?admin=teams");
  const dialog = page.getByRole("dialog", { name: "Admin · West Operations" });
  await dialog.getByRole("combobox", { name: "Business unit" }).selectOption("North Finance");
  await expect(page.getByRole("dialog", { name: "Admin · North Finance" })).toBeVisible();
  await expect(page).toHaveURL(/bu=north-finance/);
  await expect(page.getByRole("dialog").getByText("Accounts Payable")).toBeVisible();
});

for (const theme of ["light", "dark"] as const) {
  test(`the Teams tab and its delete confirmation have no accessibility violations (${theme})`, async ({
    page,
  }) => {
    await signInAs(page, "Callum Reid");
    await page.goto("/?admin=teams");
    const dialog = page.getByRole("dialog", { name: "Admin · Corporate Services" });
    await expect(dialog).toBeVisible();
    await expectNoA11yViolations(page, { theme });

    await dialog.getByRole("button", { name: "Delete Legal" }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await expectNoA11yViolations(page, { theme });
    await page.getByRole("button", { name: "Cancel" }).click();
  });
}
