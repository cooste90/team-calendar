import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run the real app against the test database on port 3100,
// so they never touch your dev data. Chromium runs on every push; Firefox nightly.
const isCI = Boolean(process.env.CI);
const port = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "tests/e2e/global-setup.ts",
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  // The dev server compiles each page the first time a test opens it, which can take
  // several seconds, so wait longer than Playwright's default 5s.
  expect: { timeout: 15_000 },
  // signInAs alone allows 30s for that first compile, so a whole test gets 60s, not
  // Playwright's default 30s. The longer admin flows need it when 4 workers share a cold
  // dev server.
  timeout: 60_000,
  reporter: isCI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  // The performance check (*.perf.spec.ts) is its own project: `pnpm test:perf`.
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, testIgnore: /\.perf\.spec\.ts$/ },
    { name: "firefox", use: { ...devices["Desktop Firefox"] }, testIgnore: /\.perf\.spec\.ts$/ },
    // One file at a time: each perf file loads the large seed into the same database.
    {
      name: "perf",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /\.perf\.spec\.ts$/,
      workers: 1,
    },
  ],
  webServer: {
    // Always the dev server: dev-only pages (dev sign-in, the design gallery) are switched
    // off in production builds, and e2e needs them. The CI "checks" job tests the build.
    command: `pnpm dev --port ${port}`,
    url: `http://localhost:${port}/api/health`,
    reuseExistingServer: !isCI,
    timeout: 180_000,
    env: {
      DATABASE_URL: process.env.DATABASE_URL_TEST ?? "",
      BETTER_AUTH_URL: `http://localhost:${port}`,
      DEV_SIGN_IN_ENABLED: "true",
    },
  },
});
