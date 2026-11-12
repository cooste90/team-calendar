# T37 — Production build, Dockerfile, SSO porting guide and final QA

**Phase:** 8 · **Depends on:** T36 · **Size:** M

## Goal
A release candidate the product owner can deploy to the internal Kubernetes and connect to corporate SSO, with documentation and a full acceptance walkthrough.

## Read first
- `01-architecture.md` §5.1, §12, §13
- `node_modules/next/dist/docs/01-app/02-guides/self-hosting.md`, `01-getting-started/17-deploying.md`, and the `output` config docs
- The Better Auth `genericOAuth` docs

## Deliverables
1. **Build:**
   - `output: "standalone"`.
   - A multi-stage `Dockerfile`: deps → build → runner on `node:24-slim`, non-root user, `HEALTHCHECK` hitting `/api/health`, with Prisma client/engine-free adapter files copied.
   - `.dockerignore`.
   - `pnpm docker:build` and a `docker-compose.prod.yml` for running the image locally against the compose Postgres.
2. **Migrations in production:** document running `prisma migrate deploy` as a Kubernetes init container or job. Provide `scripts/migrate.sh`.
3. **Health:** `/api/health` (liveness: process up) and `/api/health/ready` (readiness: DB reachable).
4. **`docs/PORTING-SSO.md`:**
   - the env vars to set and how to register the app with the IdP (redirect URI `{BETTER_AUTH_URL}/api/auth/oauth2/callback/{providerId}` — confirm against the current Better Auth docs);
   - how to adjust `mapSsoClaims` for the real claim names (`id`, `employeeNumber`, `firstName`, `surname`, `email`, `formalGroups`);
   - how to verify role sync (add/remove `CALENDAR_ADMIN`, sign in again);
   - how to set `SUPER_ADMIN_EMPLOYEE_NUMBERS`;
   - disabling dev sign-in (`DEV_SIGN_IN_ENABLED=false`, which is enforced in production anyway);
   - an optional local rehearsal with a mock OIDC server container.
5. **`docs/OPERATIONS.md`:** environment variables table, backups (Postgres), time zone notes, how to add the next year's bank holidays (Admin › Public holidays), and a log line glossary.
6. **`docs/USER-GUIDE.md`** (short and plain): reading the calendar, booking, half days, day swaps, profile and pattern, and keyboard shortcuts. **`docs/ADMIN-GUIDE.md`:** teams, users, public holidays, export, business units.
7. **Final QA walkthrough:**
   - Go through **every section of `00-product-spec.md`** as a checklist in `docs/qa-checklist.md`, ticking each rule with how it was verified (test name or manual step).
   - Run the whole test suite, a Lighthouse pass, and the large-seed performance checks.
   - Fix small issues. Log anything bigger in `progress.md`.
8. Update the root `README.md` (project overview, setup, scripts, links to the docs).

## Acceptance criteria
- The Docker image builds and runs locally against Postgres, and the health checks pass.
- Every spec rule is ticked in `docs/qa-checklist.md`, and the GitLab pipeline is fully green on `main`.
