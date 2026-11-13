import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run the real app against the test database on port 3100,
// so they never touch your dev data. Chromium runs on every push; Firefox nightly.
const isCI = Boolean(process.env.CI);
const port = 3100;

export default defineConfig({
  testDir: "tests/e2e",
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
    // CI tests the production build; locally the dev server starts faster.
    command: isCI ? `pnpm build && pnpm start --port ${port}` : `pnpm dev --port ${port}`,
    url: `http://localhost:${port}/api/health`,
    reuseExistingServer: !isCI,
    timeout: 180_000,
    env: { DATABASE_URL: process.env.DATABASE_URL_TEST ?? "" },
  },
});
