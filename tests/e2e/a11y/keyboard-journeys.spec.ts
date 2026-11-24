import { expect, type Page, test } from "@playwright/test";
import { futureWeek, leaveBars, openWeek, typed } from "../grid-helpers";
import { signInAs } from "../sign-in";

// The keyboard journeys in accessibility §5, with no mouse at all. Along the way they
// check what a screen reader is given: dialog names, focus, and the polite messages.

const focused = (page: Page) => page.locator(":focus");
const announcement = (page: Page) => page.locator("div[aria-live=polite].sr-only");

// Presses Tab until the focused element's name matches, which also proves it can be
// reached from the keyboard.
async function tabTo(page: Page, name: RegExp) {
  for (let presses = 0; presses < 60; presses++) {
    await page.keyboard.press("Tab");
    // Roughly its accessible name: aria-label, else its <label>, else its text.
    const current = await page.evaluate(() => {
      const element = document.activeElement as HTMLInputElement | null;
      if (!element) return "";
      const label = element.labels?.[0]?.textContent;
      return element.getAttribute("aria-label") ?? label ?? element.textContent ?? "";
    });
    if (name.test(current.trim())) return;
  }
  throw new Error(`Tab never reached ${name}`);
}

// Presses ↓ in an open menu until the focused item's text matches. Radix moves focus a
// moment after the key, so each press waits for focus to move on.
async function arrowTo(page: Page, name: RegExp) {
  for (let presses = 0; presses < 15; presses++) {
    const current = (await focused(page).textContent()) ?? "";
    if (name.test(current)) return;
    await page.keyboard.press("ArrowDown");
    await expect.poll(async () => focused(page).textContent()).not.toBe(current);
  }
  throw new Error(`The menu never reached ${name}`);
}

test("book several days, edit them, delete them and undo, all from the keyboard", async ({
  page,
}) => {
  const week = futureWeek(53);
  await signInAs(page, "Priya Shah");
  await openWeek(page, week.sunday);

  // Into the grid with the skip link, then to Priya's Tuesday.
  await tabTo(page, /^Skip to calendar$/);
  await page.keyboard.press("Enter");
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(focused(page)).toHaveAttribute("data-column", week.tuesday);
  await expect(focused(page)).toHaveAccessibleName(/^Tuesday \d+ \w+, Priya Shah/);

  // Book Tuesday to Thursday.
  await page.keyboard.press("Enter");
  const addForm = page.getByRole("dialog", { name: "Add event" });
  await expect(addForm).toHaveAccessibleDescription(/^For Priya Shah · /);
  await tabTo(page, /^End date/);
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type(typed(week.thursday));
  await page.keyboard.press("Enter");
  await tabTo(page, /^Add event$/);
  await page.keyboard.press("Enter");
  await expect(addForm).toHaveCount(0);
  await expect(announcement(page)).toHaveText(/^Annual leave added for Priya Shah, Tuesday /);
  await expect(focused(page)).toHaveAttribute("data-column", week.tuesday);

  // Edit: the day's menu, Edit, a note, Save changes.
  await page.keyboard.press("Enter");
  await expect(focused(page)).toHaveAccessibleName("View Annual leave");
  await page.keyboard.press("Tab");
  await expect(focused(page)).toHaveAccessibleName("Edit Annual leave");
  await page.keyboard.press("Enter");
  const editForm = page.getByRole("dialog", { name: "Edit event" });
  await expect(editForm).toBeVisible();
  await tabTo(page, /^Notes/);
  await page.keyboard.type("Dentist");
  await tabTo(page, /^Save changes$/);
  await page.keyboard.press("Enter");
  await expect(editForm).toHaveCount(0);
  await expect(announcement(page)).toHaveText(/^Annual leave changed for Priya Shah/);
  await expect(focused(page)).toHaveAttribute("data-column", week.tuesday);

  // Delete asks first (it's several days), then Alt+N reaches Undo in the toast.
  await page.keyboard.press("Delete");
  await expect(page.getByRole("alertdialog", { name: /^Delete Annual leave, / })).toBeVisible();
  await page.keyboard.press("Tab"); // from Cancel to Delete
  await page.keyboard.press("Enter");
  await expect(leaveBars(page, "Priya Shah")).toHaveCount(0);
  await expect(announcement(page)).toHaveText("Booking deleted. Press Alt+N to undo.");
  await page.keyboard.press("Alt+KeyN");
  await tabTo(page, /^Undo$/);
  await page.keyboard.press("Enter");
  await expect(leaveBars(page, "Priya Shah")).toHaveCount(1);
  await expect(announcement(page)).toHaveText("Booking restored.");
});

test("filter the teams from the keyboard", async ({ page }) => {
  await signInAs(page, "Priya Shah");
  await tabTo(page, /^Teams$/);
  await page.keyboard.press("Enter");
  await expect(focused(page)).toHaveAccessibleName("Search teams");
  await page.keyboard.type("Service");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await expect(focused(page)).toHaveAccessibleName("Teams, 1 selected");
  await expect(page.getByText("Filtered: Service Design")).toBeVisible();
});

test("change the theme and open my profile from the keyboard", async ({ page }) => {
  await signInAs(page, "Priya Shah");
  await page.emulateMedia({ colorScheme: "light" });
  await tabTo(page, /^User menu for Priya Shah/);

  await page.keyboard.press("Enter");
  await arrowTo(page, /^Dark$/);
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  // Back to the system theme, so other tests aren't affected.
  await arrowTo(page, /^System$/);
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await expect(focused(page)).toHaveAccessibleName(/^User menu for Priya Shah/);

  await page.keyboard.press("Enter");
  await arrowTo(page, /My profile/);
  await page.keyboard.press("Enter");
  const profile = page.getByRole("dialog", { name: "My profile" });
  await expect(profile).toBeVisible();
  await expect(page).toHaveTitle("My profile · WestCal");
  await page.keyboard.press("Escape");
  await expect(profile).toHaveCount(0);
  await expect(focused(page)).toHaveAccessibleName(/^User menu for Priya Shah/);
});

// Fatima is North Finance's admin. The team goes down one place and back again, so the
// order other tests see doesn't change.
test("reorder a team with the Move buttons, from the keyboard", async ({ page }) => {
  await signInAs(page, "Fatima Rahman");
  await tabTo(page, /^User menu for /);
  await page.keyboard.press("Enter");
  await arrowTo(page, /^Admin$/);
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Admin · North Finance" });
  await expect(dialog).toBeVisible();
  const status = dialog.getByRole("status");

  await tabTo(page, /^Move .+ down$/);
  const moveDown = (await focused(page).getAttribute("aria-label")) ?? "";
  const team = moveDown.match(/^Move (.+) down$/)?.[1];
  await page.keyboard.press("Enter");
  await expect(status).toHaveText(new RegExp(`^${team} moved to position 2 of \\d+\\.$`));
  await expect(focused(page)).toHaveAccessibleName(moveDown);

  await page.keyboard.press("Shift+Tab");
  await expect(focused(page)).toHaveAccessibleName(`Move ${team} up`);
  await page.keyboard.press("Enter");
  await expect(status).toHaveText(new RegExp(`^${team} moved to position 1 of \\d+\\.$`));
});
