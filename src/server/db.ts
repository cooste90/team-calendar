import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { type Prisma, PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";

// The one Prisma client for the whole app.

function createClient() {
  return new PrismaClient({
    adapter: new PrismaPg(env.DATABASE_URL),
    log: env.PRISMA_LOG === "query" ? ["query"] : [],
  });
}

// In development Next.js re-runs this file on every code change. Keeping the client
// on globalThis stops each reload from opening another connection pool.
const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

// Call this first inside any transaction that changes someone's bookings (architecture
// §3.2). It locks their User rows until the transaction ends, so a second save for the
// same person waits instead of racing the first one. ORDER BY makes every transaction
// lock rows in the same order, so two of them can never deadlock.
export async function lockUsers(tx: Prisma.TransactionClient, userIds: string[]) {
  await tx.$executeRaw`SELECT 1 FROM "User" WHERE id = ANY(${userIds}) ORDER BY id FOR UPDATE`;
}
