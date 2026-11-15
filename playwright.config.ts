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
  reporter: isCI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  // The performance check (*.perf.spec.ts) is its own project: `pnpm test:perf`.
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, testIgnore: /\.perf\.spec\.ts$/ },
    { name: "firefox", use: { ...devices["Desktop Firefox"] }, testIgnore: /\.perf\.spec\.ts$/ },
    { name: "perf", use: { ...devices["Desktop Chrome"] }, testMatch: /\.perf\.spec\.ts$/ },
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
