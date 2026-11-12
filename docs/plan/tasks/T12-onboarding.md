# T12 — Sign-in BU choice, welcome page and new-user provisioning

**Phase:** 2 · **Depends on:** T11 · **Size:** M

## Goal
First-time users end up in the right BU's Unassigned group, with a default pattern and every future public holiday.

## Read first
- `00-product-spec.md` §1.3, §1.4, §6.2 (new users)
- `01-architecture.md` §5.2, §5.3
- Mockup "Brand" (sign-in look)

## Deliverables
1. **`/sign-in` page** (designed with the brand: logo, wordmark, tagline, a centred card):
   - If more than one BU exists, show a Select: "First time here? Which business unit do you belong to?" with helper text "Only used the first time you sign in." Listing all BUs (including hidden ones) is intended (spec §1.3).
   - The selected value is posted to a server action that sets the `westcal-requested-bu` cookie (httpOnly, sameSite=lax, 10-minute expiry, signed or HMAC'd with `BETTER_AUTH_SECRET`) and then starts the SSO redirect.
   - In dev, the BU choice is passed to the dev sign-in as well.
   - Accessible: labelled select and a clear focus order. Axe test.
2. **`syncSsoProfile`:** read and verify the cookie for **new users only**, then clear it.
3. **`provisionNewUser(userId, businessUnitId | null)`**, in one transaction:
   - default working pattern (`effectiveFrom 2000-01-02`, Mon–Fri FULL);
   - for every public holiday with date ≥ today, run `planPublicHolidayCreate(ph, [snapshot])` from T08 for this single person and save the result with `saveBookingChanges` (a new user has no bookings, so these are plain creates);
   - the BU is set if known; the team is left null.
4. **`/welcome` page:** shown when a user has no BU (`requireUser` redirect).
   - Lists the BUs with a radio group and a Continue button.
   - The server action sets the BU, keeps the team null (Unassigned), and redirects to `/`.
   - If only one BU exists it assigns automatically and redirects (no page).
5. **Unassigned state:** add `actor.isUnassigned` to the session actor. The calendar banner itself is built in T17. Here, just expose the flag and add a test.
6. **Shared service** `saveBookingChanges(tx, changes)` in `src/server/services/save-booking-changes.ts` (architecture §8): writes a `BookingChanges` object with one Prisma call per array (`createMany`, `deleteMany`, a loop of `update`s, `createMany` for exclusions, `updateMany` to unlink). It should be about 15 lines. T13, T22, T23, T27 and T31 reuse it.

## Tests
- Integration:
  - a new user with a valid cookie gets that BU;
  - an invalid or expired cookie is ignored;
  - a returning user's BU is unchanged even with a cookie present;
  - a new user gets future PHs per pattern (no PH on a Saturday PH date, etc.) and no past PHs;
  - with a single BU they are auto-assigned.
- E2E: a new dev profile with 2+ BUs, sign in without choosing → `/welcome` → choose → calendar.

## Acceptance criteria
- Every path from spec §1.3 is covered by a test.
- `saveBookingChanges` is used and has its own integration test (one case covering every array).
