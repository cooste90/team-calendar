import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import { signInAs } from "./sign-in";

// The admin dialog's Business units tab (super admins). The test adds its own business
// unit with a unique name, hides it and deletes it again, so other tests don't see it
// for long.

test("a super admin adds a business unit, hides it from others, and deletes it", async ({
  browser,
  page,
}) => {
  const stamp = Date.now();
  const name = `Zeta Unit ${stamp}`;
  const slug = `zeta-unit-${stamp}`;

  await signInAs(page, "Grace Adeyemi");
  await page.goto("/?admin=units");
  const admin = page.getByRole("dialog", { name: /^Admin · / });
  const status = admin.getByRole("status");
  await admin.getByRole("textbox", { name: "New business unit" }).fill(name);
  await admin.getByRole("button", { name: "Add business unit" }).click();
  await expect(status).toHaveText(`${name} added.`);

  // New people can pick it when they first sign in.
  const signInPage = await (await browser.newContext()).newPage();
  await signInPage.goto("/sign-in");
  const choice = signInPage.getByLabel("First time here? Which business unit do you belong to?");
  await expect(choice.getByRole("option", { name })).toBeAttached();

  await admin.getByRole("checkbox", { name: `Hidden (${name})` }).check();
  await expect(status).toHaveText(`${name} is now hidden.`);

  // Priya, a regular user of West Operations, isn't a member: it's not in her switcher,
  // and a link to it shows her own BU.
  const priya = await (await browser.newContext()).newPage();
  await signInAs(priya, "Priya Shah");
  const switcher = priya.getByRole("combobox", { name: "Business unit" });
  await expect(switcher.getByRole("option", { name: "West Operations" })).toBeAttached();
  await expect(switcher.getByRole("option", { name: new RegExp(name) })).toHaveCount(0);
  await priya.goto(`/?bu=${slug}`);
  await expect(priya.getByText("This business unit is no longer available")).toBeVisible();
  await expect(priya).not.toHaveURL(/bu=/);
  await expect(priya.getByText("West Operations · all teams · all people")).toBeVisible();

  await admin.getByRole("button", { name: `Delete ${name}` }).click();
  const confirm = page.getByRole("alertdialog", { name: `Delete ${name}?` });
  await expect(confirm).toHaveAccessibleDescription("It has no people.");
  await confirm.getByRole("button", { name: "Delete business unit" }).click();
  await expect(status).toHaveText(`${name} deleted.`);
  await expect(admin.getByRole("button", { name: `Delete ${name}` })).toHaveCount(0);
});

for (const theme of ["light", "dark"] as const) {
  test(`the Business units tab and its dialogs have no accessibility violations (${theme})`, async ({
    page,
  }) => {
    await signInAs(page, "Grace Adeyemi");
    await page.goto("/?admin=units");
    const admin = page.getByRole("dialog", { name: /^Admin · / });
    await expect(admin.getByRole("tab", { name: "Business units" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expectNoA11yViolations(page, { theme });

    await admin.getByRole("button", { name: "Delete West Operations" }).click();
    await expect(page.getByRole("alertdialog")).toContainText("Move or delete its");
    await expectNoA11yViolations(page, { theme });
    await page.getByRole("button", { name: "OK" }).click();
  });
}
