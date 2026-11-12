# T23 — Booking update, delete, remove day, trim, undo, PH detach and availability overrides

**Phase:** 4 · **Depends on:** T22 · **Size:** L

## Goal
Every way of changing an existing booking (plus one-off availability overrides), safe and rule-complete.

## Read first
- `00-product-spec.md` §4.2, §5.4, §5.6, §6.3, §6.5
- T07 (`allowedEdits`, `planRemoveDay`, `planTrimRemaining`), T08 (`planUserEditsPhCopy`, `planUserDeletesPhCopy`, `planReconcileForPerson`)

## Deliverables (`src/server/services/bookings.ts`, `availability.ts`, plus actions)
1. **`updateBooking(actor, id, patch, { replace }, today)`:**
   - Permission check on the subject; `canModify`; `validateUpdate(before, after, today)` (ongoing → only the end date/half and notes); conflict detection excluding itself, with the same replace semantics as T22.
   - If the booking is a PH copy (`publicHolidayId != null`) and its dates change, apply `planUserEditsPhCopy` (detach plus exclusion). A notes-only change does **not** detach.
   - Set `updatedById` and `updatedAt`.
2. **`deleteBooking(actor, id, today)`:** must be future (or today); PH copies add an exclusion. Returns a **snapshot** of the deleted booking for undo.
3. **`restoreBooking(actor, snapshot, today)`** (undo):
   - Re-creates the booking through `createBooking` without replace. If it now conflicts, it returns CONFLICT ("Couldn't undo — something else is booked there now").
   - For a PH copy it also removes the exclusion and re-links `publicHolidayId`, if the PH still exists and the date hasn't passed.
   - It runs the normal create checks (permission, time rules, conflicts), so no extra expiry logic is needed. The UI offers Undo for about 8 seconds.
4. **`removeBookingDay(actor, id, date, today)`:** uses `planRemoveDay`. Detaches a PH copy if it applies to one.
5. **`trimRemainingDays(actor, id, today)`:** for ongoing bookings.
6. **Availability overrides** (`src/server/services/availability.ts`):
   - `setAvailabilityOverride(actor, userId, date, value | null)`. Permission: `canEditProfileOf` (self or admins). Time rules as for bookings. `null` removes the override.
   - After any change, run `planReconcileForPerson(person, futurePHs, date)` for the affected date and save it with `saveBookingChanges`, in the same transaction.
7. **Server actions** for each of the above, with zod schemas, all through `authedAction` (which calls `refresh()`).
8. **No repetition:** update, remove-day and trim all share the same "load booking → check permission and time rules → lock → check conflicts → save" steps. Put those steps in one small private helper in `bookings.ts` rather than copying them into each function. Every write uses `lockUsers` before reading conflicts.

## Tests (integration)
- Ongoing booking: changing the type → FIELD_LOCKED; extending the end ✓; trim → ends yesterday.
- Past booking: any update or delete → PAST_LOCKED, including for an ADMIN who created it within the 7-day window.
- Remove a middle day → 2 bookings with preserved audit fields; remove the first day → start moves.
- PH copy: a date change → detached plus exclusion; a later admin PH move (T31) leaves it alone (verify with the T08 planner directly); a notes-only edit stays linked.
- Delete a PH copy → exclusion; undo → linked again, with no exclusion.
- Undo after a conflicting booking was created → CONFLICT.
- Override: setting "working" on a PH date that was OFF → the PH copy is created (reconcile); setting "not working" → the PH copy is removed.
- A teammate can edit a teammate's booking ✓; a teammate can't set an availability override for a teammate ✗ (profile-level permission).

## Acceptance criteria
- Every modification rule in spec §5.4 has a passing integration test.
