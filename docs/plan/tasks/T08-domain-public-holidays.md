# T08 — Public holiday planning engine

**Phase:** 1 · **Depends on:** T07 · **Size:** M

## Goal
Pure "planner" functions that work out what bookings must change when a public holiday changes, covering every rule in spec §6. Each returns one plain `BookingChanges` object (architecture §8).

## Read first
- `00-product-spec.md` §6 (all of it), §4.2
- `01-architecture.md` §8

## Deliverables (`src/domain/public-holidays.ts`)
**Types:**
- `PublicHoliday { id, date, name }`
- `PersonSnapshot { userId, availability: AvailabilityLookup, bookings: Booking[] /* overlapping the dates involved */, exclusions: string[] }` (as built)
- `BookingChanges`, `emptyChanges()`, `mergeChanges(list)`, `carveBooking` and `changesForPieces` live in `src/domain/events.ts` (created in T07) and are reused here.

**Functions:**
- `phSlotsFor(workDay, date)`: FULL → [AM, PM]; AM → [AM]; PM → [PM]; OFF → [].
- `planPublicHolidayCreate(ph, people)`: for each person with working slots on `ph.date`, no exclusion, and no booking already linked to `ph.id`:
  1. Collect the bookings overlapping those slots. **PARENTAL** bookings remove their overlapping slots from the PH slot set (the PH isn't created on those halves).
  2. Carve the remaining PH slots out of every other overlapping booking. Remainders with **0 working days are removed**. Other remainders go into `update` (first piece) and `create` (second piece, keeping type, notes and audit `createdById`).
  3. Add the PH booking to `create` over the final slot set. It is always within one day, so it's a full day, AM only or PM only. Set `publicHolidayId`, `type: PUBLIC_HOLIDAY` and `notes: ph.name`.
- `planPublicHolidayMove(ph, oldDate, newDate, people)`:
  - for people with an **untouched** copy (a booking with `publicHolidayId === ph.id`): remove the old copy, then apply create rules on `newDate`;
  - people without a linked copy are left alone, except people with no exclusion and no linked copy whose old date was non-working: they get the create rules on the new date too (the "new date is now a working day" case);
  - people with an exclusion are skipped.
- `planPublicHolidayDelete(ph, people)`: remove every untouched copy. Exclusions are cleaned up by cascade.
- `planReconcileForPerson(person, futurePublicHolidays, fromDate)`, for each PH with date ≥ fromDate:
  - untouched copy exists but its slots differ from the current `phSlotsFor` → delete it and re-create (with carving);
  - copy exists but the day is now OFF → delete it;
  - no copy, no exclusion, and the day is now working → create (with carving).
- `planUserEditsPhCopy(booking)` → `unlink` the booking and add an exclusion. `planUserDeletesPhCopy(booking)` → `remove` it and add an exclusion. Services call these from T23.
- Every planner is **deterministic**: each array is sorted by userId and then slot, so tests can compare results with `toEqual`.

## Tests
These spec cases must each be a named test:
- A full-time worker with AL that day: the AL is deleted and a full PH is created.
- An AM-only worker: a half PH (AM) is created.
- An OFF-day worker: nothing.
- Parental leave that day: kept, with no PH.
- Parental AM + AL PM on a full day: AL deleted, PH on PM only.
- A Mon–Fri AL block with the PH on Wednesday: the block is split into Mon–Tue and Thu–Fri, and the PH is on Wed.
- A block where the PH falls on its last working day: the block is shortened.
- A person who moved their copy (exclusion): skipped on move and delete.
- Moving a PH from Mon to Tue: untouched copies are moved and overwrite Tuesday leave.
- Reconcile: the pattern now makes the PH date OFF → copy deleted; the date is now FULL instead of AM → copy expanded and the PM booking carved.
- 100% branch coverage.

## Out of scope
Saving the changes to the database (`saveBookingChanges`, T12) and UI.
