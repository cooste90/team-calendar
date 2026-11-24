import { type Browser, expect, type Page, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import { signInAs, signInAsNewPerson } from "./sign-in";

// The admin dialog's Users tab. The people moved and deleted here are brand new, each
// with their own surname, so no other test sees them.

// A brand-new person in North Finance's Unassigned group, signed in in their own browser
// window (so the test can check what happens to their session).
async function newPersonInNorthFinance(browser: Browser, surname: string) {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/dev-sign-in");
  await signInAsNewPerson(page, surname);
  await page.getByRole("radio", { name: "North Finance" }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL("/");
  return page;
}

// A person's row inside one team group on the grid (each group button controls its rows).
async function rowInGroup(page: Page, group: RegExp, name: string) {
  const button = page.getByRole("grid").getByRole("button", { name: group });
  const rowGroupId = await button.getAttribute("aria-controls");
  return page.locator(`[id="${rowGroupId}"]`).getByRole("rowheader", { name });
}

function usersTab(page: Page) {
  return page.getByRole("dialog", { name: /^Admin · / });
}

async function findInUsersTab(page: Page, surname: string) {
  await usersTab(page).getByRole("searchbox", { name: "Search people" }).fill(surname);
}

test("an admin puts a new person in a team, then deletes them, which signs them out", async ({
  browser,
  page,
}) => {
  const surname = `Teamless${Date.now()}`;
  const newPerson = await newPersonInNorthFinance(browser, surname);

  // Grace, the super admin, manages North Finance here. (Not Fatima, its admin: the
  // profile tests rename her while they run.)
  await signInAs(page, "Grace Adeyemi");
  await page.goto("/?bu=north-finance&admin=users");
  await findInUsersTab(page, surname);
  await expect(
    usersTab(page).getByRole("heading", { name: "Unassigned · 1 person" }),
  ).toBeVisible();
  const team = usersTab(page).getByRole("combobox", { name: `Team for New ${surname}` });
  await expect(team).toHaveValue(""); // "Choose team…"
  await team.selectOption("Treasury");
  await expect(usersTab(page).getByRole("status")).toHaveText(`New ${surname} moved to Treasury.`);

  await page.keyboard.press("Escape");
  await expect(await rowInGroup(page, /^Treasury,/, `New ${surname}`)).toBeVisible();

  // Delete them: type the surname to confirm.
  await page.goto("/?bu=north-finance&admin=users");
  await findInUsersTab(page, surname);
  await usersTab(page)
    .getByRole("button", { name: `More for New ${surname}` })
    .click();
  await page.getByRole("menuitem", { name: "Delete…" }).click();
  const confirm = page.getByRole("alertdialog", { name: `Delete New ${surname}?` });
  await confirm.getByRole("textbox", { name: /^Type their surname/ }).fill(surname.toLowerCase());
  await confirm.getByRole("button", { name: `Delete New ${surname}` }).click();
  await expect(usersTab(page).getByRole("status")).toHaveText(`New ${surname} deleted.`);
  await expect(usersTab(page).getByText(`No one matches “${surname}”.`)).toBeVisible();

  // Their session went with them.
  await newPerson.reload();
  await expect(newPerson.getByRole("heading", { name: "Your session has ended" })).toBeVisible();
});

test("a super admin moves someone to another BU, where they start in Unassigned", async ({
  browser,
  page,
}) => {
  const surname = `Mover${Date.now()}`;
  await newPersonInNorthFinance(browser, surname);

  await signInAs(page, "Grace Adeyemi");
  await page.goto("/?bu=north-finance&admin=users");
  await findInUsersTab(page, surname);
  await usersTab(page)
    .getByRole("button", { name: `More for New ${surname}` })
    .click();
  await page.getByRole("menuitem", { name: "Move to business unit…" }).click();
  const move = page.getByRole("dialog", { name: `Move New ${surname} to another business unit` });
  await move.getByRole("combobox", { name: "Business unit" }).selectOption("West Operations");
  await move.getByRole("button", { name: "Move" }).click();
  await expect(usersTab(page).getByRole("status")).toHaveText(
    `New ${surname} moved to West Operations, in its Unassigned group.`,
  );

  await page.goto("/?bu=west-operations");
  await expect(await rowInGroup(page, /^Unassigned,/, `New ${surname}`)).toBeVisible();
});

for (const theme of ["light", "dark"] as const) {
  test(`the Users tab and its delete confirmation have no accessibility violations (${theme})`, async ({
    page,
  }) => {
    await signInAs(page, "Callum Reid");
    await page.goto("/?admin=users");
    const dialog = usersTab(page);
    await expect(dialog.getByRole("tab", { name: "Users" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expectNoA11yViolations(page, { theme });

    await dialog.getByRole("button", { name: "More for Ana Kowalska" }).click();
    await page.getByRole("menuitem", { name: "Delete…" }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await expectNoA11yViolations(page, { theme });
    await page.getByRole("button", { name: "Cancel" }).click();
  });
}
