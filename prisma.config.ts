// Prisma 7 doesn't read .env by itself, so load it here for the Prisma CLI.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // The seed reuses app code. Some of it imports "server-only", which only loads under
    // the "react-server" condition (as it does inside Next.js).
    seed: "tsx --conditions=react-server prisma/seed/index.ts",
  },
  datasource: {
    // process.env (not Prisma's env() helper, which throws when the variable is
    // missing) so `prisma generate` still works on a fresh clone without a .env file.
    url: process.env.DATABASE_URL,
  },
});
