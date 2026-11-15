import { expect, type Page, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import { signInAs } from "./sign-in";

// The names of the team groups showing in the grid, e.g. ["Service Design", "Commercial"].
async function teamsShown(page: Page) {
  const names = await page
    .getByRole("grid")
    .getByRole("button", { expanded: true })
    .allTextContents();
  return names.map((name) => name.split(/\d/)[0].trim());
}

test("filters show the chosen teams plus the chosen people, and survive a reload", async ({
  page,
}) => {
  await signInAs(page, "Priya Shah");
  await expect(page.getByText("West Operations · all teams · all people")).toBeVisible();

  // Two teams.
  await page.getByRole("button", { name: "Teams", exact: true }).click();
  await page.getByRole("option", { name: "Service Design" }).click();
  await page.getByRole("option", { name: "Finance Operations" }).click();
  await page.getByRole("button", { name: "Done" }).click();
  await expect.poll(() => teamsShown(page)).toEqual(["Service Design", "Finance Operations"]);

  // Plus one person from another team (union, spec §2.4).
  await page.getByRole("button", { name: "People", exact: true }).click();
  const commercialPerson = page
    .getByRole("group", { name: "Commercial", exact: true })
    .getByRole("option")
    .first();
  const name = (await commercialPerson.textContent()) ?? "";
  await commercialPerson.click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "People, 1 selected" })).toBeFocused();

  await expect
    .poll(() => teamsShown(page))
    .toEqual(["Service Design", "Finance Operations", "Commercial"]);
  await expect(page.getByRole("grid").getByRole("rowheader", { name })).toBeVisible();
  await expect(
    page.getByText("Filtered: Service Design, Finance Operations · 1 person"),
  ).toBeVisible();

  // The filters are in the URL, so they're still there after a reload.
  await expect(page).toHaveURL(/teams=.*people=/);
  await page.reload();
  await expect
    .poll(() => teamsShown(page))
    .toEqual(["Service Design", "Finance Operations", "Commercial"]);

  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByText("West Operations · all teams · all people")).toBeVisible();
  await expect.poll(async () => (await teamsShown(page)).length).toBe(7);
});

for (const theme of ["light", "dark"] as const) {
  test(`an open filter has no accessibility violations (${theme})`, async ({ page }) => {
    await signInAs(page, "Tom Okafor");
    await page.getByRole("button", { name: "People", exact: true }).click();
    // Tick someone, so the check covers a chip too.
    await page.getByRole("listbox", { name: "People" }).getByRole("option").first().click();
    await expect(page.getByRole("list", { name: "Chosen people" })).toBeVisible();
    await expectNoA11yViolations(page, { theme });
  });
}
