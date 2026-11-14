# T07 — Booking validation, conflicts, carving, time rules and permissions

**Phase:** 1 · **Depends on:** T06 · **Size:** L

## Goal
Every booking rule in the spec, as pure, exhaustively tested functions that services and UI both call.

## Read first
- `00-product-spec.md` §1.2–1.4, §5 (all of it), §6.3
- `01-architecture.md` §3.1, §3.2, §4

## Deliverables
### `src/domain/events.ts`
- Types: `LeaveType` (mirrors the Prisma enum), `BookingInput { userId, type, startDate, startHalf, endDate, endHalf, notes? }`, `Booking extends BookingInput { id, publicHolidayId?, createdById?, updatedById?, createdAt, updatedAt }`.
- `bookingInputSchema` (zod):
  - dates valid; start ≤ end at slot level;
  - for a single day, any of FULL/AM/PM is allowed;
  - for multi-day, `startHalf ∈ {AM, PM}` and `endHalf ∈ {AM, PM}` are both allowed (Full = AM start / PM end);
  - notes trimmed, ≤ 500 characters, empty string becomes undefined;
  - maximum span 366 days (a sanity limit — note it in `progress.md` as an assumption).
- `formPortionToHalves(...)` and `halvesToFormPortion(...)` for the form's Duration / First day / Last day controls.

### `src/domain/conflicts.ts`
- `findConflicts(candidate: SlotRange, existing: Booking[], ignoreId?)` returns the overlapping bookings and the exact overlapping slots.
- `describeConflict(conflict, displayName, viewerIsSubject)`: for example `"You already have Working from home on Fri 13 Nov (full day)."` or `"Tom Okafor already has Annual leave on Thu 12 Nov (morning)."`
- `planReplace(candidate, conflicts, today)`: returns a `BookingChanges` object (architecture §8: `remove` / `update` / `create` for the remainder pieces) that carve the candidate's slots out of each conflicting booking, using `subtract`. It throws `PastLockedError` if any carved slot is before today. Remainder pieces with **0 working days are still kept**, because bookings on non-working days are allowed. **Exception:** for PH carving (T08), zero-day remainders are dropped.

### `src/domain/time-rules.ts`
- `earliestCreatableDate(role, today)`: USER → today; ADMIN / SUPER_ADMIN → today − 7.
- `classifyBooking(booking, today)`: `"past" | "ongoing" | "future"` (ongoing means start < today ≤ end).
- `canModify(booking, today)`: false for past bookings.
- `allowedEdits(booking, today)`: future → all fields; ongoing → `{ endDate, endHalf, notes }` with new end ≥ today; past → none.
- `validateCreate(startDate, role, today)` and `validateUpdate(before, after, today)` **throw** `PastLockedError` (past, or too far in the past) or `ValidationError` (a locked field changed). As built: they throw rather than return errors, and `validateCreate` takes just the date so day swaps can reuse it.
- `planTrimRemaining(booking, today)`: for an ongoing booking, set the end to yesterday PM. "Delete the remaining days."
- `planRemoveDay(booking, date, today)`: splits the booking into up to 2 bookings (date must be ≥ today). Removing an end day just shortens it.
- The same rules apply to `AvailabilityOverride` (create, change or remove only for date ≥ earliest creatable; never for past dates once they exist).

### `src/domain/permissions.ts`
As in architecture §4. Inputs are plain objects, never Prisma types. (As built: no `PermissionError`; services throw `ForbiddenError` from `errors.ts` when a `can…` function says no.)

## Tests
Table-driven. Must include:
- The full **actor × subject** matrix for `canEditBookingsFor`: USER in team (self, teammate, other team, unassigned person, other BU); unassigned USER (self); ADMIN (own BU incl. unassigned, other BU); SUPER_ADMIN (any).
- Create windows: USER yesterday → error; ADMIN today − 7 → ok; ADMIN today − 8 → error.
- Ongoing booking: changing the type → `FIELD_LOCKED`; extending the end → ok; setting the end to yesterday through update → error (use trim instead).
- The conflict message for every half combination.
- `planReplace`:
  - candidate inside a long booking → 2 remainders;
  - candidate covering the AM half of a full day → a PM remainder;
  - a conflict in the past → `PastLockedError`.
- `canViewBusinessUnit` for a hidden BU (member / non-member / SA).
- 100% branch coverage.

## Out of scope
Public holiday generation (T08) and persistence.
