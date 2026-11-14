# T13 — Seed data, dev SSO profiles and the large seed

**Phase:** 2 · **Depends on:** T12 · **Size:** M

## Goal
Realistic, deterministic data that makes every feature demo-able and testable, plus a 1,000-user dataset for performance.

## Read first
- `00-product-spec.md` (all; the seed must exercise every rule)
- The faker docs (`@faker-js/faker`, `en_GB` locale, `faker.seed`)

## Deliverables
1. **`prisma/seed/index.ts`**, wired into `prisma.config.ts` (`migrations.seed`). It uses the domain functions and `saveBookingChanges`, not hand-written rows, so the seed obeys the same rules as the app. Keep it readable: one small file per concern (`business-units.ts`, `people.ts`, `bookings.ts`, `public-holidays.ts`), called in order from `index.ts`.
   - Size options: `--size=default|large` (env `SEED_SIZE` also works).
   - It is **idempotent**: it wipes app tables first, and refuses to run when `NODE_ENV=production`.
2. **Default size:**
   - **West Operations** (about 50 people, 7 teams: Service Design, Data & Insight, Finance Operations, Customer Support, Commercial, Estates & Facilities, People & Culture; plus 2 Unassigned).
   - **North Finance** (about 80 people, 9 teams).
   - **Corporate Services** (**hidden**, about 70 people, 8 teams). About 200 people in total.
   - People have `faker.person` UK names, including some accented surnames, and a few with preferred names.
   - Working patterns: 75% default, 15% part-time (e.g. off Wed, or AM-only Fri), 5% weekend workers, 5% with a pending pattern change from next Sunday.
   - A handful of availability overrides (day swaps).
3. **Public holidays:** England & Wales bank holidays for 2025, 2026 and 2027, hard-coded in `prisma/seed/uk-bank-holidays.ts` with names. **Verify every date against https://www.gov.uk/bank-holidays.json while writing the file** and record the date checked in a comment. Generate copies through `planPublicHolidayCreate`, in date order, so overwrite rules apply. Make a few people "detached": one moved Boxing Day, one deleted a PH.
4. **Bookings** for roughly −6 to +6 months around today, generated so that:
   - every leave type appears;
   - there are half days, AM+PM pairs with different types, and multi-day blocks crossing weekends and month boundaries;
   - there is ongoing leave crossing today;
   - created-by-teammate and created-by-admin audit data exist;
   - there are notes of various lengths, including the 500-character limit;
   - no overlaps (use `findConflicts` and skip the candidate when there's a clash).
5. **`prisma/seed/dev-sso-profiles.ts`:** exported fake SSO profiles that match seeded users (same `ssoId`, `employeeNumber`, `formalGroups`):
   - at least: a regular user in a team, an unassigned user, an ADMIN per BU (`CALENDAR_ADMIN` group), a SUPER_ADMIN (employee number in `.env.example`), a member of the hidden BU, and a brand-new profile that doesn't exist yet (to test onboarding).
   - `.env.example` lists the matching `SUPER_ADMIN_EMPLOYEE_NUMBERS`.
   - The file already exists from T11 with 4 sample profiles. Each item is `{ profile: SsoProfile, businessUnit: <BU name>, team: <team name> | null }`. The dev sign-in page groups by `businessUnit` and requests that BU (by name) for new users, so use the seeded BU names.
6. **Large size:** about 1,000 users across 6 BUs (the largest about 300), with proportionally more bookings. It must finish in under 60 seconds locally. Use `createMany` (through `saveBookingChanges`).
7. **README:** a "Seeded accounts" table (dev sign-in names and roles) and the commands `pnpm db:seed` / `pnpm db:seed:large`.

## Tests
- Integration: running the seed (default) completes, and its invariants hold: no overlaps (check with `findConflicts` over each person's bookings), every user has a pattern, no PH on anyone's OFF day for future dates, the hidden BU is flagged, and each BU has at least one admin profile.
- Determinism: two runs produce the same counts and the same first 10 user names (fixed faker seed and a fixed "today" parameter for the seed, `SEED_TODAY`, defaulting to the real today).

## Acceptance criteria
- After `pnpm db:reset && pnpm db:seed`, signing in as each dev profile shows sensible data (checked manually and by the T16+ e2e tests).
