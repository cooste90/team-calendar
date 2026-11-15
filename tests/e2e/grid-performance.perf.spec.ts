import { execSync } from "node:child_process";
import { expect, type Page, test } from "@playwright/test";
import { signInAs } from "./sign-in";

// The grid's performance budgets (T19) with the large seed: South Health has 300 people.
// Run it on its own with `pnpm test:perf` (locally, and nightly in CI), never alongside
// the other browser tests: it replaces the test database's data with the large seed.
// The next `pnpm test:e2e` puts the default seed back (tests/e2e/global-setup.ts).

const BUDGET = {
  navigationMs: 1000, // the next month is on screen and usable
  longTaskMs: 50, // no long task while scrolling
  keyPressMs: 16, // an arrow key moves focus within one frame
  filterMs: 50, // ticking a filter redraws the grid (T21)
  // Unticking it brings all 300 people back, about 9,300 new cells in month view. That
  // measured 51–77ms on its own, and up to ~130ms here, straight after scrolling the
  // whole grid. The product owner accepted about 100ms (T21). Week view stays under 50ms.
  everyoneBackMs: 100,
};
// The budgets are for a production build. Sign-in needs the dev server, so by default
// everything runs there; React's development build is slower, so those numbers are
// pessimistic. To measure production (as CI does nightly), start a build on the test
// database and point PERF_BASE_URL at it. The session cookie works on both servers:
//   pnpm build
//   DATABASE_URL=<DATABASE_URL_TEST> BETTER_AUTH_URL=http://localhost:3200 pnpm start -p 3200
//   PERF_BASE_URL=http://localhost:3200 pnpm test:perf
const appUrl = process.env.PERF_BASE_URL ?? "";

// How far over budget still passes. Shared CI machines are slower and noisier than a
// developer laptop, and the development build (no PERF_BASE_URL) is 2–3× slower still.
const TOLERANCE = (process.env.CI ? 3 : 1.5) * (appUrl ? 1 : 2.5);

test.describe.configure({ timeout: 180_000 });
// Playwright's trace copies the whole page around every action, which takes longer than
// the key presses being measured.
test.use({ trace: "off" });
test.beforeAll(() => {
  execSync("pnpm db:seed:large", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL_TEST },
  });
});

// page.evaluate runs in the browser, so the records are kept on `window` between calls.
type Records = { longTasks: number[]; slowKeys: number[] };

// Records long tasks, and key presses that take 16ms or more from the key going down to
// the next frame on screen (the browser's Event Timing API only reports those).
async function startRecording(page: Page) {
  await page.evaluate(() => {
    const records: Records = { longTasks: [], slowKeys: [] };
    (window as unknown as { records: Records }).records = records;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) records.longTasks.push(entry.duration);
    }).observe({ type: "longtask" });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === "keydown") records.slowKeys.push(entry.duration);
      }
      // TypeScript's DOM types don't know durationThreshold yet.
    }).observe({ type: "event", durationThreshold: 16 } as PerformanceObserverInit);
  });
}

// Returns what was recorded so far and starts again from empty.
async function takeRecords(page: Page): Promise<Records> {
  return page.evaluate(() => {
    const holder = window as unknown as { records: Records };
    const taken = holder.records;
    holder.records = { longTasks: [], slowKeys: [] };
    return taken;
  });
}

// Clicks the first option in the open Teams filter, and times it from the click to the
// first frame on screen with the grid's new rows. (The grid redraws just after the click
// event has finished, so the browser's Event Timing doesn't include it.)
async function timeFirstTeamClick(page: Page, { allRowsAfter }: { allRowsAfter: boolean }) {
  const option = page.getByRole("listbox", { name: "Teams" }).getByRole("option").first();
  return option.evaluate(async (element, everyone) => {
    const started = performance.now();
    (element as HTMLElement).click();
    await new Promise<void>((resolve) => {
      function check() {
        const rows = document.querySelectorAll('[role="rowheader"]').length;
        const done = everyone ? rows === 300 : rows < 300;
        if (done)
          requestAnimationFrame(() => resolve()); // the frame that shows them
        else requestAnimationFrame(check);
      }
      check();
    });
    return performance.now() - started;
  }, allRowsAfter);
}

test("month view with 300 people stays within the budgets", async ({ page }) => {
  await signInAs(page, "Grace Adeyemi");
  await page.goto(`${appUrl}/?bu=south-health&view=month&date=2026-11-01`);
  await expect(page.getByRole("grid")).toBeVisible();

  // Navigation: Next month, until the new month's grid is on screen and usable.
  const started = Date.now();
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("December 2026");
  await expect(page.locator("[aria-busy=true]")).toHaveCount(0);
  const navigationMs = Date.now() - started;
  const rows = await page.getByRole("rowheader").count();

  // Scrolling the grid from top to bottom.
  await startRecording(page);
  const grid = page.getByRole("region", { name: "Calendar" });
  await grid.hover();
  for (let step = 0; step < 60; step++) {
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(16);
  }
  const scrolling = await takeRecords(page);
  const scrolledPx = await grid.evaluate((element) => element.scrollTop);

  // Arrow keys: 40 moves around the grid, 50ms apart (a held-down key repeats about
  // every 33–50ms; presses sent back to back would queue behind each other's frames).
  await page.getByRole("link", { name: "Skip to calendar" }).focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  await takeRecords(page); // drop the Enter on the skip link
  for (const key of ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"]) {
    for (let step = 0; step < 10; step++) {
      await page.keyboard.press(key);
      await page.waitForTimeout(50);
    }
  }
  const keys = await takeRecords(page);

  // Filters: tick the first team (the grid shrinks to it), then untick it (all 300 again).
  await page.getByRole("button", { name: "Teams", exact: true }).click();
  const tickMs = await timeFirstTeamClick(page, { allRowsAfter: false });
  const untickMs = await timeFirstTeamClick(page, { allRowsAfter: true });

  const results = {
    navigationMs,
    longestScrollTaskMs: Math.max(0, ...scrolling.longTasks),
    slowestKeyPressMs: Math.max(0, ...keys.slowKeys),
    filterTickMs: tickMs,
    filterUntickMs: untickMs,
  };
  process.stdout.write(`Grid performance: ${JSON.stringify(results)}\n`);

  // First, that it measured what it meant to: all 300 rows, scrolled right down.
  expect(rows).toBe(300);
  expect(scrolledPx).toBeGreaterThan(10_000);
  expect(results.navigationMs).toBeLessThan(BUDGET.navigationMs * TOLERANCE);
  expect(results.longestScrollTaskMs).toBeLessThan(BUDGET.longTaskMs * TOLERANCE);
  // Event Timing rounds durations to 8ms, so a reported 24ms is the 1.5× tolerance.
  expect(results.slowestKeyPressMs).toBeLessThanOrEqual(BUDGET.keyPressMs * TOLERANCE);
  expect(results.filterTickMs).toBeLessThan(BUDGET.filterMs * TOLERANCE);
  expect(results.filterUntickMs).toBeLessThan(BUDGET.everyoneBackMs * TOLERANCE);
});
