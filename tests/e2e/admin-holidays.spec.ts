import { expect, type Page, test } from "@playwright/test";
import { addDays } from "@/domain/dates";
import { UK_BANK_HOLIDAYS } from "../../prisma/seed/uk-bank-holidays";
import { expectNoA11yViolations } from "./a11y";
import { dayCell, futureWeek, openWeek, typed } from "./grid-helpers";
import { signInAs } from "./sign-in";

// The admin dialog's Public holidays tab. Holidays are global, so the test adds one on a
// Friday about a month ahead (the seed's part-timers work Friday mornings only), and
// deletes it again at the end. Other tests use weeks well beyond that.

// The first Friday at least 4 weeks ahead that isn't already a bank holiday.
function freeFriday() {
  const taken = new Set(UK_BANK_HOLIDAYS.map((holiday) => holiday.date));
  for (let weeks = 4; ; weeks++) {
    const friday = addDays(futureWeek(weeks).sunday, 5);
    if (!taken.has(friday)) return friday;
  }
}

// The cell labels for one day: "Friday 1 January, Owen Hughes, morning only."
async function labelsOn(page: Page, date: string) {
  return page
    .locator(`[role="gridcell"][data-column="${date}"]`)
    .evaluateAll((cells) => cells.map((cell) => cell.getAttribute("aria-label") ?? ""));
}

// Someone with nothing booked that day: full-time, or morning only.
function personFrom(labels: string[], availability: "" | ", morning only") {
  for (const label of labels) {
    const match = label.match(
      /^\w+ \d+ \w+, (.+?)(, morning only|, afternoon only|, not a working day)?\.$/,
    );
    if (match && (match[2] ?? "") === availability) return match[1];
  }
  throw new Error(`Nobody free with availability "${availability}"`);
}

test("an admin adds a public holiday: full days for full-timers, half for mornings only", async ({
  page,
}) => {
  const friday = freeFriday();
  await signInAs(page, "Grace Adeyemi");
  await openWeek(page, friday);
  const labels = await labelsOn(page, friday);
  const fullTimer = personFrom(labels, "");
  const morningsOnly = personFrom(labels, ", morning only");

  await page.goto(`/?view=week&date=${friday}&admin=holidays`);
  const admin = page.getByRole("dialog", { name: /^Admin · / });
  await admin.getByRole("button", { name: "Add public holiday" }).click();
  const add = page.getByRole("dialog", { name: "Add public holiday" });
  await add.getByRole("textbox", { name: "Name" }).fill("Founders' Day");
  const date = add.getByRole("textbox", { name: "Date" });
  await date.fill(typed(friday));
  await date.press("Enter");
  await add.getByRole("button", { name: "Continue" }).click();
  await expect(add).toHaveAccessibleDescription(
    /^This applies to every business unit: \d+ people will get this holiday\./,
  );
  await add.getByRole("button", { name: "Add holiday" }).click();
  await expect(admin.getByRole("status")).toHaveText(/^Founders' Day added for \d+ people\.$/);
  await expect(admin.getByRole("region", { name: "Upcoming" })).toContainText("Founders' Day");

  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("columnheader", { name: /public holiday: Founders' Day/ }),
  ).toBeVisible();
  await expect(dayCell(page, fullTimer, friday)).toHaveAttribute(
    "aria-label",
    /Public holiday, .*, 1 day\./,
  );
  await expect(dayCell(page, morningsOnly, friday)).toHaveAttribute(
    "aria-label",
    /Public holiday, .*, morning, 0\.5 days\./,
  );

  // Deleting it takes the copies away again.
  await page.goto(`/?view=week&date=${friday}&admin=holidays`);
  await admin.getByRole("button", { name: "Delete Founders' Day" }).click();
  const confirm = page.getByRole("alertdialog", { name: "Delete Founders' Day?" });
  await expect(confirm).toHaveAccessibleDescription(/\d+ people will lose this holiday/);
  await confirm.getByRole("button", { name: "Delete holiday" }).click();
  await expect(admin.getByRole("status")).toHaveText("Founders' Day deleted.");
  await page.keyboard.press("Escape");
  await expect(dayCell(page, fullTimer, friday)).not.toHaveAttribute(
    "aria-label",
    /Public holiday/,
  );
});

for (const theme of ["light", "dark"] as const) {
  test(`the Public holidays tab and its dialogs have no accessibility violations (${theme})`, async ({
    page,
  }) => {
    await signInAs(page, "Callum Reid");
    await page.goto("/?admin=holidays");
    const admin = page.getByRole("dialog", { name: /^Admin · / });
    await expect(admin.getByRole("tab", { name: "Public holidays" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expectNoA11yViolations(page, { theme });

    await admin.getByRole("button", { name: "Add public holiday" }).click();
    await expect(page.getByRole("dialog", { name: "Add public holiday" })).toBeVisible();
    await expectNoA11yViolations(page, { theme });
    await page.getByRole("button", { name: "Cancel" }).click();

    await admin
      .getByRole("button", { name: /^Delete / })
      .first()
      .click();
    await expect(page.getByRole("alertdialog")).toContainText("will lose this holiday");
    // Delete fades in from disabled once the numbers are there, so check its colours after
    // the fade. (Waiting for every transition on the page doesn't work: the grid's
    // off-screen team groups aren't drawn, so their transitions never finish.)
    await expect(page.getByRole("button", { name: "Delete holiday" })).toHaveCSS("opacity", "1");
    await expectNoA11yViolations(page, { theme });
    await page.getByRole("button", { name: "Cancel" }).click();
  });
}
