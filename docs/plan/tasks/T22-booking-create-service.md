# T22 — Booking create service: conflicts, replace and transactions

**Phase:** 4 · **Depends on:** T21 · **Size:** M

**As built:** see the T22 entry in `progress.md`.
- **Replace and public holidays:** `planReplace` itself detaches any public holiday copy it cuts, so every caller gets that.
- **Day count:** it's worked out after the transaction commits.

## Goal
A server-side create flow that enforces every rule, gives the UI exact conflict details, and supports "Replace".

## Read first
- `00-product-spec.md` §5.1–5.5, §6.3
- `01-architecture.md` §3.2, §4, §6.2
- The T07 and T08 domain modules, T10 `lockUsers`, and T12 `saveBookingChanges`

## Deliverables
1. **`src/server/services/bookings.ts` → `createBooking(actor, input, { replace: boolean }, today)`**, in one transaction:
   1. Load the subject user (BU and team).
   2. `canEditBookingsFor(actor, subject)` → FORBIDDEN otherwise. Unassigned actors are rejected.
   3. Validate with `validateCreate(input.startDate, actor.role, today)` (the time window; it throws `PastLockedError`).
   4. `lockUsers(tx, [subjectId])` (architecture §3.2).
   5. Load the subject's bookings that overlap the candidate dates, then run `findConflicts`.
   6. If there are conflicts and `!replace`: throw `ConflictError` with `{ conflicts: [{ bookingId, type, startDate, startHalf, endDate, endHalf, message }] }`, using `describeConflict`.
   7. If there are conflicts and `replace`: run `planReplace` (which throws PAST_LOCKED for past slots) and save the result with `saveBookingChanges`. Conflicting PH copies being replaced go through `planUserDeletesPhCopy` (exclusion) first.
   8. Insert the booking with `createdById = updatedById = actor.id`.
   9. Return the created booking's id and day count. The action's `refresh()` updates the grid.
   - A manually created `PUBLIC_HOLIDAY` type has `publicHolidayId = null`.
   - Read the function top to bottom: it should look like the numbered list above, each step one or two lines calling a domain function.
2. **Server action `createBookingAction`** (`authedAction`): input `{ booking, replace }`; output `{ id, count }`.
3. **Logging:** a structured `console.info` audit line for each create, with actor, subject, type and range (no notes content).

## Tests (integration)
- USER books for self ✓, for a teammate ✓, for another team ✗ (FORBIDDEN), and for yesterday ✗ (PAST_LOCKED / TOO_FAR_IN_PAST).
- ADMIN books for anyone in their BU ✓, someone in another BU ✗, today − 7 ✓, today − 8 ✗.
- SUPER_ADMIN books for anyone ✓.
- An unassigned USER booking for self ✗.
- A conflict without replace returns details for each clash. With replace it carves a long booking into 2 pieces and creates the new one atomically. Replacing a past slot ✗.
- AM + PM with different types on the same day ✓.
- A race test: two parallel creates for the same slots → exactly one succeeds and the other gets CONFLICT.

## Acceptance criteria
- All spec §5.3 and §5.4 rules for creating are enforced on the server, and the tests prove it.
