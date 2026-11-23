import { execSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { UK_BANK_HOLIDAYS } from "../../prisma/seed/uk-bank-holidays";
import { futureWeek, typed } from "./grid-helpers";
import { signInAs } from "./sign-in";

// T31's target: adding a public holiday for 1,000 people (the large seed) in under 2
// seconds. This times it from Add holiday to the "added" message, which includes saving
// everyone's copies and reloading the page. Run it with `pnpm test:perf` (locally, and
// nightly in CI), like the grid's check: it replaces the test database's data.
//
// Measured on the service alone (T31): about 0.45s to add one for 954 working people,
// 0.45s to move it and 0.25s to delete it.
const BUDGET_MS = 2000;

// The same allowances as the grid's check: shared CI machines are slower, and the
// development build (no PERF_BASE_URL) is 2–3× slower still.
const appUrl = process.env.PERF_BASE_URL ?? "";
const TOLERANCE = (process.env.CI ? 3 : 1.5) * (appUrl ? 1 : 2.5);

test.describe.configure({ timeout: 180_000 });
test.use({ trace: "off" });
test.beforeAll(() => {
  execSync("pnpm db:seed:large", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL_TEST },
  });
});

// A Tuesday about six weeks ahead that isn't already a bank holiday, so most people work it.
function freeTuesday() {
  const taken = new Set(UK_BANK_HOLIDAYS.map((holiday) => holiday.date));
  for (let weeks = 6; ; weeks++) {
    const { tuesday } = futureWeek(weeks);
    if (!taken.has(tuesday)) return tuesday;
  }
}

test("adding a public holiday for 1,000 people stays within the budget", async ({ page }) => {
  await signInAs(page, "Grace Adeyemi");
  await page.goto(`${appUrl}/?admin=holidays`);
  const admin = page.getByRole("dialog", { name: /^Admin · / });
  await admin.getByRole("button", { name: "Add public holiday" }).click();
  const add = page.getByRole("dialog", { name: "Add public holiday" });
  await add.getByRole("textbox", { name: "Name" }).fill("Timing Day");
  const date = add.getByRole("textbox", { name: "Date" });
  await date.fill(typed(freeTuesday()));
  await date.press("Enter");
  await add.getByRole("button", { name: "Continue" }).click();
  await expect(add).toHaveAccessibleDescription(/\d+ people will get this holiday/);

  const started = Date.now();
  await add.getByRole("button", { name: "Add holiday" }).click();
  await expect(admin.getByRole("status")).toHaveText(/^Timing Day added for \d+ people\.$/, {
    timeout: 30_000,
  });
  const took = Date.now() - started;
  // Shown in Playwright's report, so the nightly run keeps a record.
  test.info().annotations.push({ type: "timing", description: `${took}ms` });
  expect(took).toBeLessThan(BUDGET_MS * TOLERANCE);
});
