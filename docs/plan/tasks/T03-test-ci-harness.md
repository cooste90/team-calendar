# T03 — Test harness and GitHub Actions CI

**Phase:** 0 · **Depends on:** T02 · **Size:** M

## Goal
Every kind of test the plan uses can be written and run locally and in CI from this point on.

## Read first
- `01-architecture.md` §10, §11
- `node_modules/next/dist/docs/01-app/02-guides/testing/` (Vitest and Playwright guides)

## Deliverables
1. **Vitest** (`vitest.config.ts`) using `projects`:
   - `unit`: node environment, `src/domain/**/*.test.ts`, `src/lib/**/*.test.ts`.
   - `component`: happy-dom, `src/**/*.test.tsx`, setup file with `@testing-library/jest-dom` and `vitest-axe` matchers.
   - `integration`: node, `tests/integration/**/*.test.ts`, run serially, using `DATABASE_URL_TEST`.
   - Coverage (v8) with a **threshold of 100% branches/lines for `src/domain/**`** (enforced from T05 onwards; add the config now with an empty-safe glob).
   - `tsconfig` paths are resolved (`vite-tsconfig-paths` or native resolution).
2. **Integration helpers** in `tests/integration/helpers/`:
   - Global setup runs `prisma migrate reset --force --skip-seed` against the test DB once.
   - `resetDb()` truncates all tables (excluding `_prisma_migrations`) between tests.
   - A `testDb` Prisma client.
3. **Playwright** (`playwright.config.ts`):
   - `webServer` runs `pnpm build && pnpm start` in CI, or `pnpm dev` locally, against the test DB.
   - Projects: `chromium` (default) and `firefox` (CI nightly).
   - Install `@axe-core/playwright` and add a helper `expectNoA11yViolations(page, { theme })` that runs the WCAG 2.2 AA tags (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`).
   - A smoke test opens `/` and passes axe.
4. **Scripts:** `lint`, `typecheck`, `test` (unit + component), `test:watch`, `test:int`, `test:e2e`, `test:coverage`. Update `check`. CI calls only these scripts, never raw tool commands, so the same checks run locally and the CI file stays easy to move to GitLab later.
5. **`.github/workflows/ci.yml`:** one workflow with the jobs in architecture §11:
   - Runs on pull requests and pushes to `main`, plus a nightly `schedule` that adds the Firefox e2e project.
   - Sets up pnpm (`pnpm/action-setup`) and Node 24 (`actions/setup-node` with `cache: pnpm`).
   - A `postgres:17` service for the integration and e2e jobs.
   - The e2e job runs in the official Playwright container matching the installed version.
   - Uploads the Playwright HTML report with `actions/upload-artifact` when e2e fails.
   - Keep it plain: no reusable workflows, composite actions or matrix tricks. Repeating the short setup steps in each job is fine here.
6. **Example tests:** one trivial unit, component and integration test each, to prove the wiring. (Later tasks replace them.)

## Acceptance criteria
- `pnpm test`, `pnpm test:int` (with `db-test` up) and `pnpm test:e2e` all pass locally.
- The workflow passes `actionlint` (`pnpm dlx actionlint` or the binary), runs green on GitHub, and contains no placeholder secrets.
- An axe violation added on purpose fails the e2e smoke test (check it, then revert).

## Out of scope
Real feature tests.
