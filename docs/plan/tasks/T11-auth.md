# T11 — Better Auth, SSO profile sync, roles, dev sign-in and session guard

**Phase:** 2 · **Depends on:** T10 · **Size:** L

## Goal
Authentication that behaves exactly like production SSO in role and profile handling, with a safe dev-only way to sign in as any fake profile.

## Read first
- `00-product-spec.md` §1
- `01-architecture.md` §5 (all of it), §12
- `node_modules/next/dist/docs/01-app/02-guides/authentication.md`, `data-security.md`, and `03-api-reference/03-file-conventions/proxy.md`
- The Better Auth docs: Next.js integration, Prisma adapter, `genericOAuth` plugin, database hooks / `hooks.after`, session config, server-side `auth.api.getSession`, and the internal adapter for creating sessions

## Deliverables
1. **`src/server/auth.ts`:** the Better Auth instance.
   - Prisma adapter.
   - `user.additionalFields` for the custom columns (`input: false` for anything clients must not set).
   - The Better Auth tables already exist from T10 (generated with `npx auth generate`, 1.7.23, then merged into `prisma/schema.prisma` with PascalCase table names). Pin `better-auth` at the same version. If its CLI output ever changes, re-run it in a scratch folder and merge by hand. Don't let it overwrite the schema.
   - Session `expiresIn` 12 hours, `updateAge` 1 hour.
   - Email/password **disabled**.
   - `genericOAuth` plugin registered **only when** the `SSO_*` env vars are present, with `getUserInfo` / `mapProfileToUser` calling `mapSsoClaims` (`src/server/sso-claims.ts`).
   - An after-sign-in hook that calls `syncSsoProfile`.
   - Mount it at `src/app/api/auth/[...all]/route.ts`.
2. **`src/server/sso-claims.ts`:** `mapSsoClaims(claims): SsoProfile`, validated with zod and reporting clear errors for missing claims. Use placeholder claim names `id`, `employeeNumber`, `firstName`, `surname`, `email` and `formalGroups` (from the product owner).
3. **`src/server/auth-sync.ts`:** `syncSsoProfile(profile, opts)` as in architecture §5.2.
   - Role computation is a pure function `computeRole(profile, env)` in `src/domain/roles.ts`, with tests.
   - New-user provisioning (default pattern plus future PH generation) is delegated to `provisionNewUser()`. Leave it as a stub that only creates the default pattern; T12 completes it.
4. **Dev sign-in:**
   - `POST /api/dev/sign-in` (or a Better Auth plugin endpoint) is guarded by `env.DEV_SIGN_IN_ENABLED && process.env.NODE_ENV !== "production"`. It returns a hard 404 otherwise.
   - Body: an `SsoProfile` (zod) plus an optional `requestedBusinessUnitId`.
   - It runs `syncSsoProfile`, creates the session and sets the cookie the same way Better Auth does (use the documented server API; don't hand-roll cookie signing).
   - **Page `/dev-sign-in`:** lists the profiles from `prisma/seed/dev-sso-profiles.ts` (T13 fills these in; create the file now with 4 sample profiles) grouped by BU, with role badges, plus a "custom profile" form. A banner says "Development only".
5. **`src/server/session.ts`:**
   - `getCurrentUser()`, cached per request with React `cache()`.
   - `requireUser()`: redirects to `/sign-in` when unauthenticated, and to `/welcome` when the user has no BU.
   - `requireRole(...)`.
   - All of them return a domain `Actor`.
6. **`proxy.ts`:** an optimistic cookie check that redirects to `/sign-in` for app routes. It excludes `/sign-in`, `/dev-sign-in`, `/welcome`, `/api/auth`, `/api/health`, `/api/dev`, static assets and `_next`.
7. **Sign-out:** a server action that calls Better Auth's signOut and redirects to `/sign-in`.
8. **Minimal `/sign-in` page:** a "Sign in with SSO" button (disabled with an explanatory note when SSO isn't configured) and a "Developer sign-in" link (dev only). T12 adds the BU dropdown.

**As built:** see architecture §5.5 and the T11 entry in `progress.md`. The main differences:
- SSO sync runs in `mapProfileToUser`, not an after-hook.
- Sessions are never refreshed (no `updateAge`).
- Dev sign-in is a plugin endpoint at `/api/auth/dev-sign-in`.
- `/welcome` is protected and is a placeholder until T12.

## Tests
- Unit: `computeRole` covers group / no group / allowlist / both / a case-sensitivity decision (exact match on group name, trimmed employee numbers).
- Unit: the dev sign-in guard returns 404 when `NODE_ENV=production` even if the flag is true.
- Integration:
  - `syncSsoProfile` creates a user on the first call and updates the name and email on the second;
  - promotes to ADMIN when the group is added and **demotes** when it's removed;
  - SUPER_ADMIN from the allowlist.
- E2E: sign in through `/dev-sign-in` as an admin, land on `/`, sign out, and get redirected to `/sign-in`.

## Acceptance criteria
- There is no way to reach app data without a session (an e2e check opens `/` and `/api/export/attendance` without a cookie: the page redirects to `/sign-in` and the route returns 401).
- The role changes on the next sign-in after the group is removed (integration test).

## Out of scope
The BU dropdown, the welcome page and PH inheritance (T12).
