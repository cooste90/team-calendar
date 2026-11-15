// `pnpm db:seed` (about 200 people) or `pnpm db:seed:large` (about 1,000).
// SEED_SIZE=large and SEED_TODAY=2026-11-14 work too; "today" defaults to the real today.
import "dotenv/config";
import { calendarDateSchema, todayIn } from "@/domain/dates";
import { env } from "@/lib/env";
import { db } from "@/server/db";
import { seedDatabase } from "./seed-database";

async function main() {
  const sizeArgument = process.argv.find((arg) => arg.startsWith("--size="))?.split("=")[1];
  const size = sizeArgument ?? process.env.SEED_SIZE ?? "default";
  if (size !== "default" && size !== "large") {
    throw new Error(`Unknown seed size "${size}". Use "default" or "large".`);
  }
  const today = calendarDateSchema.parse(process.env.SEED_TODAY ?? todayIn(env.APP_TIME_ZONE));

  const started = Date.now();
  const result = await seedDatabase({ size, today });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  // biome-ignore lint/suspicious/noConsole: a command-line script reports what it did.
  console.info(
    `Seeded ${result.businessUnits} business units, ${result.people} people and ` +
      `${result.bookings} bookings (today = ${today}) in ${seconds}s.`,
  );
  await db.$disconnect();
}

main();
