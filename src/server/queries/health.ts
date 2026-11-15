import "server-only";
import { db } from "../db";

// For the health check: throws if the database can't be reached.
export async function pingDatabase() {
  await db.$queryRaw`SELECT 1`;
}
