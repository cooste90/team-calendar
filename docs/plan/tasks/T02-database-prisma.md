# T02 — Local Postgres and Prisma 7 bootstrap

**Phase:** 0 · **Depends on:** T01 · **Size:** S

## Goal
A one-command local database and a working Prisma 7 client set up the Prisma 7 way.

## Read first
- `01-architecture.md` §1, §3 (intro only), §12, §13
- The current Prisma 7 docs: `prisma.config.ts`, the `prisma-client` generator, driver adapters (`@prisma/adapter-pg`), and environment loading. Prisma 7 does **not** load `.env` automatically: use `dotenv` or `import "dotenv/config"` inside `prisma.config.ts`.

## Deliverables
1. **`docker-compose.yml`:**
   - `postgres:17` service `db` on port 5432 (database `westcal`, user `westcal`).
   - A second service `db-test` on port 5433 (database `westcal_test`, using `tmpfs` for speed).
   - Healthchecks and a named volume for dev data.
2. **Prisma:**
   - Install `prisma`, `@prisma/client` and `@prisma/adapter-pg` (+ `pg`).
   - Create `prisma.config.ts` (schema path, migrations path, seed command placeholder).
   - `prisma/schema.prisma` with the `prisma-client` generator outputting to `src/generated/prisma` and a placeholder model `HealthCheck` (removed in T10). Add `src/generated` to `.gitignore`.
3. **`src/server/db.ts`** (`import "server-only"`): a singleton `PrismaClient` using `PrismaPg` from `env.DATABASE_URL`, reused across hot reloads in dev, with query logging behind `PRISMA_LOG=query`.
4. **`GET /api/health`:** runs `SELECT 1` and returns `{ status: "ok", db: "ok" }` or a 503.
5. **Scripts:**
   - `db:up` / `db:down` (docker compose)
   - `db:migrate` (`prisma migrate dev`)
   - `db:reset`
   - `db:studio`
   - `db:generate`
   - `postinstall` running `prisma generate`
6. **README:** prerequisites (Docker Desktop, Node 24, pnpm) and the first-run steps.

## Acceptance criteria
- `pnpm db:up && pnpm db:migrate && pnpm dev`, then `curl localhost:3000/api/health`, returns ok.
- `pnpm build` works without a database running (no DB access at build time).
- Biome, typecheck and build stay green.

## Out of scope
The real schema (T10).
