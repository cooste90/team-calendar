import { execSync } from "node:child_process";

// Runs once before all integration tests: bring the test database up to the latest
// migration. Data is cleared between tests by reset-db.ts.
export default function setup() {
  const url = process.env.DATABASE_URL_TEST ?? "";

  // Tests empty every table, so never let them run against a non-test database.
  if (!new URL(url).pathname.endsWith("_test")) {
    throw new Error(`DATABASE_URL_TEST must point at a database ending in "_test", got "${url}"`);
  }

  execSync("pnpm prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
}
