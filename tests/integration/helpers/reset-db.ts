import { beforeEach } from "vitest";
import { db } from "@/server/db";

// Every integration test starts with empty tables (the migrations stay applied).
beforeEach(async () => {
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;

  if (tables.length > 0) {
    const names = tables.map((table) => `"${table.tablename}"`).join(", ");
    await db.$executeRawUnsafe(`TRUNCATE ${names} RESTART IDENTITY CASCADE`);
  }
});
