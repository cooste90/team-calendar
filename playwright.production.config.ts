import "dotenv/config";
import { defineConfig } from "@playwright/test";

// Checks a production build (T36): the dev-only pages are gone and the production
// headers are sent. The other browser tests need the dev server (for dev sign-in), so
// this has its own config. Run `pnpm build` first, then `pnpm test:production`.
const port = 3200;

export default defineConfig({
  testDir: "tests/production",
  forbidOnly: Boolean(process.env.CI),
  reporter: "list",
  use: { baseURL: `http://localhost:${port}` },
  webServer: {
    command: `pnpm start --port ${port}`,
    // A page that needs no database, so the check runs without one.
    url: `http://localhost:${port}/accessibility`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
