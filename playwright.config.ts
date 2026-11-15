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
  reporter: isCI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
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
