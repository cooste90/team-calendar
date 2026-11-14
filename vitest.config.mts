import "dotenv/config";
import path from "node:path";
import { defineConfig } from "vitest/config";

// Three kinds of tests (see docs/plan/01-architecture.md §10):
//   unit        - pure functions in src/domain and src/lib
//   component   - React components in a fake browser (happy-dom)
//   integration - server code against the real test database (pnpm db:up first)
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    // "server-only" throws outside Next.js. In tests, swap it for its empty version.
    alias: { "server-only": path.resolve("node_modules/server-only/empty.js") },
  },
  test: {
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/generated/**", "**/*.test.{ts,tsx}"],
      // Business rules must be fully tested.
      thresholds: { "src/domain/**": { 100: true } },
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/domain/**/*.test.ts", "src/lib/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "component",
          environment: "happy-dom",
          include: ["src/**/*.test.tsx"],
          setupFiles: ["tests/component-setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          // Tests share one database, so run the files one at a time.
          fileParallelism: false,
          env: {
            // Point the app's database client at the test database.
            DATABASE_URL: process.env.DATABASE_URL_TEST ?? "",
            // Run in the app's time zone (CI runs in UTC), so the date tests would
            // catch a calendar date shifting through local time.
            TZ: "Europe/London",
            // Fixed role settings, so the sign-in tests don't depend on your .env file.
            ADMIN_GROUP_NAME: "CALENDAR_ADMIN",
            SUPER_ADMIN_EMPLOYEE_NUMBERS: "100001",
          },
          globalSetup: ["tests/migrate-test-db.ts"],
          setupFiles: ["tests/integration/helpers/reset-db.ts"],
        },
      },
    ],
  },
});
