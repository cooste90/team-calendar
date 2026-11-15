import { execSync } from "node:child_process";
import migrateTestDatabase from "../migrate-test-db";

// Before the browser tests: the latest migrations, then the default seed, so the tests
// can sign in as the dev profiles (prisma/seed/dev-sso-profiles.ts) and see real data.
export default function setup() {
  migrateTestDatabase();
  execSync("pnpm db:seed", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL_TEST },
  });
}
