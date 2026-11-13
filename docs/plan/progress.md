# Progress log

Append one entry per task, newest at the bottom. Keep entries short and factual.

```
## TXX — <title> — <YYYY-MM-DD>
**Status:** done | blocked
**Summary:** what was built (2–5 bullets)
**Key files:** paths
**Simplicity pass:** what you removed or merged after re-reading the diff (04-code-style.md)
**Deviations from plan:** what and why (or "none")
**Follow-ups:** anything a later task must know
**Questions for the product owner:** (or "none")
```

---

## T00 — Planning — 2026-11-12
**Status:** done
**Summary:**
- Product spec, architecture, design system, accessibility plan and 37 tasks written with the product owner.
- Design mockup canvas created: https://claude.ai/artifact/Aq7zARQnJRuY8t9pV5QFo6 (private to the product owner until shared).
**Key files:** `docs/plan/*`
**Deviations from plan:** n/a
**Follow-ups:** the product owner to sign off the design mockup before T04.
**Questions for the product owner:** none outstanding. The product owner accepted the decisions listed at the end of planning.

## T00b — Simplicity revision — 2026-11-12
**Status:** done
**Summary:**
- The product owner (a junior developer who will maintain the code) asked for code that is as simple, short and readable as possible, with no repetition. Added `04-code-style.md` and made it required reading for every task.
- Simplified the architecture: server components + server actions + `refresh()` instead of TanStack Query; search-param dialogs instead of intercepting/parallel routes; a `lockUsers` row lock + plain overlap check instead of a Postgres exclusion constraint; a plain `BookingChanges` object instead of an op list; CSS animations instead of Motion; plain forms instead of react-hook-form; no virtualisation; no drag and drop; a static CSP.
**Key files:** `docs/plan/04-code-style.md`, `01-architecture.md` §1–3, §6–9, and tasks T04, T05, T08, T10, T12–T19, T22–T25, T27, T29–T31, T34, T36.
**Deviations from plan:** this entry is the revision.
**Follow-ups:** none.
**Questions for the product owner:** none.

## T00c — CI on GitHub for development — 2026-11-13
**Status:** done
**Summary:**
- The product owner hosts the repo on GitHub during development and will move to GitLab for production.
- T03 now builds `.github/workflows/ci.yml` (GitHub Actions). Every CI job only calls a `pnpm` script.
- T37 writes `docs/MOVING-TO-GITLAB.md` with an equivalent `.gitlab-ci.yml` for the move. It isn't committed as a live file, so there's never a second, unused pipeline.
**Key files:** `00-product-spec.md` (non-functional), `01-architecture.md` §1, §2, §11, `README.md`, tasks T03, T37.
**Deviations from plan:** this entry is the change.
**Follow-ups:** none.
**Questions for the product owner:** none.

## T00d — Mockup sign-off and change process — 2026-11-13
**Status:** done
**Summary:**
- The product owner signed off the design mockup (https://claude.ai/artifact/Aq7zARQnJRuY8t9pV5QFo6). T04 can use it as the visual reference.
- Added "Changing the plan" to `README.md` and an empty `backlog.md` for future ideas.
**Key files:** `docs/plan/README.md`, `docs/plan/backlog.md`
**Deviations from plan:** none.
**Follow-ups:** none. T01 can start.
**Questions for the product owner:** none.

## T01 — Tooling baseline — 2026-11-13
**Status:** done
**Summary:**
- Pinned Node 24 (`.nvmrc`, `engines`) and pinned every dependency exactly. Added zod 4.6.7 and lefthook 2.2.2.
- `next.config.ts`: `reactCompiler`, `typedRoutes`, `poweredByHeader: false`. Biome: a11y as errors, `noExplicitAny`, `noConsole` (allows error and warn), `useSortedClasses` (auto-fixed on save and commit), line width 100.
- lefthook: pre-commit formats staged files and type-checks; pre-push runs `pnpm test`. Checked with a deliberately messy file, which the hook fixed.
- `src/lib/env.ts` validates server env with zod and throws a readable list of problems. `.env.example` documents every variable.
- Cleaned the starter (placeholder "WestCal" page, `lang="en-GB"`, removed the unused `public/` SVGs). Added the code-style summary and plan pointer to `AGENTS.md`, and a quick start to `README.md`.
**Key files:** `package.json`, `biome.json`, `lefthook.yml`, `next.config.ts`, `src/lib/env.ts`, `.env.example`, `.gitattributes`, `AGENTS.md`, `README.md`
**Simplicity pass:** removed the starter's unused SVGs and the template comment in `next.config.ts`. Made `format` run `biome check --write`, so one command fixes formatting, imports and safe lint issues. The CI lint job now uses the same `pnpm lint` (`biome check`); architecture §11 was updated to match.
**Deviations from plan:**
- `typecheck` is `next typegen && tsc --noEmit`, because Next's global route types (e.g. `LayoutProps`) only exist after typegen.
- Added `.gitattributes` (`eol=lf`). Git on Windows converts files to CRLF, which Biome's formatter would flag everywhere.
- Kept TypeScript 5.9.3. TypeScript 7 (the native Go rewrite) is the current npm release, but it's a big change, so leave it until Next.js officially recommends it.
- `lefthook` was added to `ignoredBuiltDependencies` in `pnpm-workspace.yaml`. Its postinstall script isn't needed because `prepare` runs `lefthook install`.
**Follow-ups:** `globals.css` still has the starter's `font-family: Arial` on `body`; T04 replaces the styles. Nothing imports `env` yet. T02 and T11 will.
**Questions for the product owner:** none.

## T02 — Local Postgres and Prisma 7 bootstrap — 2026-11-13
**Status:** done
**Summary:**
- `docker-compose.yml`: `db` (postgres:17, :5432, named volume) and `db-test` (:5433, tmpfs), both with healthchecks. `pnpm db:up` waits until they're healthy.
- Prisma 7.10.1 with `prisma.config.ts`, the `prisma-client` generator to `src/generated/prisma`, and a placeholder `HealthCheck` model plus an `init` migration.
- `src/server/db.ts`: a single `PrismaClient` using `PrismaPg`, kept on `globalThis` in dev, with query logging when `PRISMA_LOG=query` (added to `env.ts` and `.env.example`).
- `GET /api/health` returns `{status:"ok",db:"ok"}`, or a 503 when the DB is down (both checked by hand).
- `db:*` scripts, `postinstall: prisma generate`, and README prerequisites and first-run steps.
**Key files:** `docker-compose.yml`, `prisma.config.ts`, `prisma/schema.prisma`, `src/server/db.ts`, `src/app/api/health/route.ts`
**Simplicity pass:** used `process.env.DATABASE_URL` in `prisma.config.ts` instead of Prisma's `env()` helper (which throws), so `pnpm install` works on a fresh clone or in CI without a `.env`. No seed placeholder config, just a comment, because T13 adds it.
**Deviations from plan:**
- npm's `latest` tag for `prisma` is `8.0.0-rc.33` (a release candidate). Used the stable **7.10.1** as the plan says. Prisma prints an "update available" banner; ignore it.
- Added `prisma` and `@prisma/engines` to `ignoredBuiltDependencies`. Their install scripts aren't needed: generate and migrate both work without them.
- `pnpm build` needs the env vars (from `.env` or CI variables) but no running database. `/api/health` is dynamic, so nothing queries the DB at build time.
**Follow-ups:** T03's integration setup uses `DATABASE_URL_TEST` against `db-test`. T10 replaces the `HealthCheck` model and the `init` migration (it's fine to delete `prisma/migrations` and start again, because nothing is deployed).
**Questions for the product owner:** none.

## T03 — Test harness and GitHub Actions CI — 2026-11-13
**Status:** done
**Summary:**
- Vitest 5 (`vitest.config.mts`) with `unit`, `component` (happy-dom + jest-dom) and `integration` projects, v8 coverage, and a 100% threshold on `src/domain/**`. The `@/` alias uses Vite 8's built-in `resolve.tsconfigPaths`, and `server-only` is aliased to its empty file in tests.
- Integration: global setup runs `prisma migrate deploy` on the test DB (it refuses unless the DB name ends in `_test`), and `reset-db.ts` truncates every table before each test.
- Playwright on port 3100 against the test DB (dev server locally, production build in CI), with `chromium` and `firefox` projects. `expectNoA11yViolations(page, { theme })` in `tests/e2e/a11y.ts` runs the WCAG 2.2 AA tags. The smoke test passes in light and dark, and a deliberate violation (an empty button) made it fail, as it should.
- Real first tests instead of throwaway ones: `src/lib/env.test.ts` (4 tests), `src/app/page.test.tsx` (heading + axe), `tests/integration/health.test.ts`.
- `.github/workflows/ci.yml` passes actionlint: jobs `checks`, `integration` and `e2e`, plus a nightly Firefox run, and it uploads the Playwright report on failure.
**Key files:** `vitest.config.mts`, `playwright.config.ts`, `tests/integration/helpers/*`, `tests/e2e/*`, `.github/workflows/ci.yml`
**Simplicity pass:** dropped `vitest-axe` (last released 2022) for a one-line `axe.run(container)` check. Dropped `@vitejs/plugin-react` and `vite-tsconfig-paths` (Vite 8 does both itself). No separate `testDb` client: integration tests use the normal `db`, which the integration project points at the test DB. Three CI jobs instead of six, so the setup steps aren't repeated.
**Deviations from plan:**
- `prisma migrate deploy` instead of `migrate reset --force --skip-seed`. Prisma 7 has no `--skip-seed`, and it blocks `migrate reset` when run by an AI agent. `deploy` + truncation does the same job without a destructive command. If migrations are rewritten (T10), restart the in-memory test DB with `docker compose restart db-test`.
- The CI jobs are grouped as above; architecture §1, §10 and §11 were updated.
- The CI env block has test-only values (clearly labelled, not real secrets).
**CI fix:** the first run failed in the e2e container: git rejected the checkout ("dubious ownership"), so `lefthook install` failed during `pnpm install`. Fixed with a `safe.directory` step, and confirmed by running the job locally in the same image (Chromium and Firefox pass).
**Follow-ups:** T04 should keep `expectNoA11yViolations` working with next-themes (it emulates `prefers-color-scheme`, which the "system" theme follows). The e2e job will need `prisma migrate deploy` and a seed step once T13 exists. Keep the Playwright container tag in step with `@playwright/test`.
**Questions for the product owner:** none.
