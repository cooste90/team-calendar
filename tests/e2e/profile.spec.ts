import { expect, type Page, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import { personRow } from "./grid-helpers";
import { signInAs, signOut } from "./sign-in";

// The profile dialog. These tests change people's names and patterns, so they use people
// no other test signs in as: Fatima Rahman (North Finance) and Callum Reid, the admin of
// Corporate Services, who edits someone else in his BU.

// Someone in Callum's BU that other tests don't look at.
function colleagueLink(page: Page) {
  return page
    .getByRole("rowheader")
    .getByRole("link")
    .filter({ hasNotText: /Callum Reid|Ana Kowalska/ })
    .first();
}

test("changing my preferred name from the user menu shows it on the calendar", async ({ page }) => {
  await signInAs(page, "Fatima Rahman");
  await page.getByRole("button", { name: /^User menu for / }).click();
  await page.getByRole("menuitem", { name: "My profile" }).click();
  await expect(page).toHaveURL(/profile=me/);
  const dialog = page.getByRole("dialog", { name: "My profile" });
  await expect(page).toHaveTitle("My profile · WestCal");

  await dialog.getByRole("textbox", { name: /Preferred first name/ }).fill("Fay");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog.getByRole("status")).toHaveText("Preferred first name saved.");

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page).not.toHaveURL(/profile=/);
  await expect(page).toHaveTitle(/North Finance · WestCal$/);
  await expect(personRow(page, "Fay Rahman")).toBeVisible();

  // Clearing it brings back the name from SSO.
  await page.getByRole("button", { name: /^User menu for Fay Rahman/ }).click();
  await page.getByRole("menuitem", { name: "My profile" }).click();
  await dialog.getByRole("textbox", { name: /Preferred first name/ }).clear();
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog.getByRole("status")).toHaveText("Preferred first name cleared.");
  await page.keyboard.press("Escape");
  await expect(personRow(page, "Fatima Rahman")).toBeVisible();
});

test("an admin changes someone's pattern; a reload keeps the dialog, Back closes it", async ({
  page,
}) => {
  await signInAs(page, "Callum Reid");
  const link = colleagueLink(page);
  const name = (await link.textContent()) ?? "";
  await link.click();
  await expect(page).toHaveURL(/person=/);
  const dialog = page.getByRole("dialog", { name: `${name}'s profile` });

  await dialog.getByRole("tab", { name: "Working pattern" }).click();
  await expect(page).toHaveURL(/tab=pattern/);
  await dialog
    .getByRole("radiogroup", { name: "Saturday" })
    .getByRole("radio", { name: "Morning" })
    .click();
  await dialog.getByRole("button", { name: /^Save — applies from Sunday/ }).click();
  await expect(dialog.getByText(`${name}'s new pattern starts on Sunday`)).toBeVisible();

  await page.reload();
  await expect(dialog.getByText(`${name}'s new pattern starts on Sunday`)).toBeVisible();
  await expect(
    dialog.getByRole("radiogroup", { name: "Saturday" }).getByRole("radio", { name: "Morning" }),
  ).toBeChecked();

  await page.goBack();
  await expect(dialog).toBeHidden();
  await expect(page).not.toHaveURL(/person=/);

  // Forward reopens it, and Cancel pending change takes the change away again.
  await page.goForward();
  await dialog.getByRole("button", { name: "Cancel pending change" }).click();
  await expect(dialog.getByText("new pattern starts")).toBeHidden();
});

test("a regular user can't open someone else's profile from a link", async ({ page }) => {
  await signInAs(page, "Callum Reid");
  const href = (await colleagueLink(page).getAttribute("href")) ?? "";
  const personId = new URLSearchParams(href.split("?")[1]).get("person");
  await signOut(page);

  await signInAs(page, "Priya Shah");
  await page.goto(`/?person=${personId}`);
  await expect(page.getByText("You can't view that profile")).toBeVisible();
  await expect(page).not.toHaveURL(/person=/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

// The seed's bookings are random, so this checks the tabs' shape. The exact numbers are
// proven against the counting rules in leave-tabs.test.tsx.
test("the leave tabs show a tally for every counted type, and upcoming leave read-only", async ({
  page,
}) => {
  await signInAs(page, "Callum Reid");
  await page.goto("/?profile=me&tab=history");
  const dialog = page.getByRole("dialog", { name: "My profile" });
  const days = String.raw`\d+(\.5)? days?`;

  await expect(dialog.getByRole("term")).toHaveText([
    /^Annual leave · \d{4}$/,
    "Special leave · last 12 months",
    "Parental leave · last 12 months",
    "Wellbeing day · last 12 months",
    "Public holiday · last 12 months",
  ]);
  await expect(dialog.getByRole("definition").first()).toHaveText(
    new RegExp(`^${days} taken · ${days} booked$`),
  );

  // Each type's past bookings open and close without leaving the tab.
  const annual = dialog.locator("details").first();
  await annual.locator("summary").click();
  await expect(annual).toHaveAttribute("open");

  await dialog.getByRole("tab", { name: "Upcoming leave" }).click();
  await expect(page).toHaveURL(/tab=upcoming/);
  const panel = dialog.getByRole("tabpanel", { name: "Upcoming leave" });
  await expect(panel.getByText("To change a booking, use the calendar.")).toBeVisible();
  await expect(panel.getByRole("button")).toHaveCount(0);
});

for (const theme of ["light", "dark"] as const) {
  for (const tab of ["details", "pattern", "history", "upcoming"]) {
    test(`the profile's ${tab} tab has no accessibility violations (${theme})`, async ({
      page,
    }) => {
      await signInAs(page, "Callum Reid");
      await page.goto(`/?profile=me&tab=${tab}`);
      await expect(page.getByRole("dialog", { name: "My profile" })).toBeVisible();
      await expectNoA11yViolations(page, { theme });
    });
  }
}
