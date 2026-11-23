import { expect, type Page, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import { signInAs, signOut } from "./sign-in";

const title = (page: Page) => page.getByRole("heading", { level: 1 });

test("the chosen view is remembered after leaving and coming back", async ({ page }) => {
  await signInAs(page, "Priya Shah");
  await page.getByRole("radio", { name: "Month" }).click();
  await expect(page).toHaveURL(/view=month/);
  await expect(title(page)).toHaveText(/^[A-Z][a-z]+ \d{4}$/); // e.g. "November 2026"

  // No view in the URL: the cookie decides.
  await page.goto("/");
  await expect(title(page)).toHaveText(/^[A-Z][a-z]+ \d{4}$/);
  await expect(page.getByRole("radio", { name: "Month" })).toBeChecked();
});

test("Previous, Next and the keyboard shortcuts move through the weeks", async ({ page }) => {
  await signInAs(page, "Priya Shah");
  await page.goto("/?view=week&date=2026-11-18");
  await expect(title(page)).toHaveText("15 – 21 November 2026");
  await expect(page).toHaveTitle("Week of 15 Nov 2026 · West Operations · WestCal");

  await page.getByRole("button", { name: "Next week" }).click();
  await expect(page).toHaveURL(/date=2026-11-22/);
  await expect(title(page)).toHaveText("22 – 28 November 2026");

  await page.getByRole("button", { name: "Previous week" }).click();
  await page.getByRole("button", { name: "Previous week" }).click();
  await expect(title(page)).toHaveText("8 – 14 November 2026");

  await page.keyboard.press("Alt+BracketRight");
  await expect(title(page)).toHaveText("15 – 21 November 2026");
});

test("a regular user can't see the hidden BU; a super admin can", async ({ page }) => {
  // Other tests add business units while this runs, so it checks the ones it knows about.
  await signInAs(page, "Priya Shah");
  const switcher = page.getByRole("combobox", { name: "Business unit" });
  await expect(switcher.getByRole("option", { name: "North Finance" })).toBeAttached();
  await expect(switcher.getByRole("option", { name: "West Operations" })).toBeAttached();
  await expect(switcher.getByRole("option", { name: /Corporate Services/ })).toHaveCount(0);

  // Switching BU shows that BU.
  await switcher.selectOption({ label: "North Finance" });
  await expect(page).toHaveURL(/bu=north-finance/);
  await expect(page.getByText("North Finance · all teams · all people")).toBeVisible();

  await signOut(page);
  await signInAs(page, "Grace Adeyemi");
  await expect(
    switcher.getByRole("option", { name: "Corporate Services (hidden)" }),
  ).toBeAttached();
});

for (const theme of ["light", "dark"] as const) {
  test(`the calendar page has no accessibility violations (${theme})`, async ({ page }) => {
    await signInAs(page, "Tom Okafor");
    await expectNoA11yViolations(page, { theme });
  });
}

test("at 320px wide the header wraps without scrolling the page sideways", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await signInAs(page, "Tom Okafor");

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
  for (const name of ["Previous week", "Next week", "Today", "More", "User menu for Tom Okafor"]) {
    await expect(page.getByRole("button", { name })).toBeInViewport();
  }

  // The Key has moved into More, where it opens as a dialog.
  await expect(page.getByRole("button", { name: "Key", exact: true })).toBeHidden();
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("menuitem", { name: "Key" }).click();
  await expect(page.getByRole("dialog", { name: "Leave types" })).toBeInViewport();
});

for (const theme of ["light", "dark"] as const) {
  test(`the open More menu has no accessibility violations (${theme})`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await signInAs(page, "Tom Okafor");
    await page.getByRole("button", { name: "More" }).click();
    await expect(page.getByRole("menu")).toBeVisible();
    await expectNoA11yViolations(page, { theme });
  });
}

test("the Key opens on hover, stays open while hovered, and Esc closes it", async ({ page }) => {
  await signInAs(page, "Priya Shah");
  const keyButton = page.getByRole("button", { name: "Key", exact: true });
  const key = page.getByRole("banner").getByRole("heading", { name: "Leave types" });

  await keyButton.hover();
  await expect(key).toBeVisible();
  await page.getByRole("banner").getByText("Wellbeing day").hover();
  await page.waitForTimeout(500); // longer than the close delay
  await expect(key).toBeVisible();

  // Esc closes it without moving the pointer (WCAG 1.4.13).
  await page.keyboard.press("Escape");
  await expect(key).toBeHidden();
});

for (const theme of ["light", "dark"] as const) {
  test(`the open Key has no accessibility violations (${theme})`, async ({ page }) => {
    await signInAs(page, "Tom Okafor");
    await page.getByRole("button", { name: "Key", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Leave types" })).toBeVisible();
    await expectNoA11yViolations(page, { theme });
  });
}
