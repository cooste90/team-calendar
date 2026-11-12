# T36 — Security headers and permission-matrix tests

**Phase:** 8 · **Depends on:** T35 · **Size:** M

## Goal
Prove that no role can do anything the spec doesn't allow, and harden the HTTP surface.

## Read first
- `01-architecture.md` §4, §13
- `00-product-spec.md` §1.2, §5.3, §9, §10
- `node_modules/next/dist/docs/01-app/02-guides/data-security.md`, `content-security-policy.md`, `production-checklist.md`

## Deliverables
1. **Permission matrix test** (`tests/integration/permission-matrix.test.ts`):
   - A plain, readable array of cases: `{ action, actor, target, expected }`. Use `it.each` over it. Cover **every server action and route handler** × actor type (USER-in-team, USER-unassigned, ADMIN-own-BU, ADMIN-other-BU, SUPER_ADMIN, anonymous) × the relevant target (self, teammate, other team same BU, Unassigned same BU, other BU, hidden BU).
   - Each case asserts the expected outcome (ok or the specific error code). Someone reading the array should be able to check it against the spec line by line.
   - A small test fails if a file under `src/server/actions` has an action that isn't in the array.
2. **Input hardening:** every action and route has zod validation with length limits. Fuzz a few actions with oversized and malformed input (no 500s; it returns VALIDATION).
3. **HTTP headers** in `next.config.ts` `headers()`:
   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
   - `X-Frame-Options: DENY` / CSP `frame-ancestors 'none'`
   - `Strict-Transport-Security` (production only)
   - A **static CSP**, written once in `next.config.ts`: `default-src 'self'`; `script-src 'self' 'unsafe-inline'` (Next.js and next-themes use small inline scripts; nonces would need extra proxy code and make every page dynamic, which isn't worth it for an internal app behind SSO. Write this reasoning in a comment); `style-src 'self' 'unsafe-inline'`; `img-src 'self' data:`; `connect-src 'self'` plus the SSO origin when configured; `frame-ancestors 'none'`.
   - Test in e2e that no CSP violations are reported (listen for `securitypolicyviolation`).
4. **Server-only:** every `src/server/**` file starts with `import "server-only"`, which makes the build fail if client code imports it. Check by grepping during review; no custom script needed.
5. **Dev-only surfaces:** `/dev-sign-in`, `/api/dev/*` and `/dev/*` all return 404 in a production build (e2e against `next start` with `NODE_ENV=production`).
6. **Dependency audit:** `pnpm audit --prod` in CI (allowed to warn, fails on critical).

## Acceptance criteria
- The matrix test passes, covers 100% of actions and routes, and the expected table matches the spec; headers are present; no CSP violations in the e2e run.
