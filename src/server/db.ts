import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
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
