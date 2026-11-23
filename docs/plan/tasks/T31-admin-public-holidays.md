# T31 — Admin Public holidays tab and bulk services

**Phase:** 6 · **Depends on:** T30 · **Size:** L

**Decided with the product owner (2026-11-23):**
- **The preview shows two totals** (people affected, existing bookings replaced) in the sentence below. No per-BU breakdown and no split count, so `previewPublicHolidayImpact` returns just those two numbers.
- **A rename still asks first,** with no numbers: "the holiday is renamed on everyone's calendar".
- **A rename relabels only copies still showing the old name;** a note someone typed on their copy is kept.
- **Any date from today is allowed,** weekends included.

## Goal
Global public holiday management that applies the T08 planners to everyone, safely and quickly, with clear warnings.

## Read first
- `00-product-spec.md` §6 (all of it)
- `01-architecture.md` §8 (scale note)
- T08 planners, T10 `lockUsers`, T12 `saveBookingChanges`

## Deliverables
1. **Services** (`src/server/services/public-holidays.ts`), all requiring `canManagePublicHolidays`:
   - `previewPublicHolidayImpact(date, kind: "create" | "move" | "delete", phId?)`: runs the planner as a dry run and returns `{ peopleAffected, bookingsReplaced, bookingsSplit, byBusinessUnit: [...] }`.
   - `createPublicHoliday(name, date)`:
     - date ≥ today, unique date, name 1–60 characters;
     - load snapshots for **all users** in batches of 250 (availability on that date, overlapping bookings, exclusions);
     - lock the affected users with `lockUsers`, plan, then `saveBookingChanges`, all in one transaction (raise the transaction timeout).
   - `updatePublicHoliday(id, { name?, date? })`:
     - a past PH (date < today) can't be changed;
     - a name-only change just updates, and also updates `notes` on untouched copies so the grid label stays right;
     - a date change runs `planPublicHolidayMove`.
   - `deletePublicHoliday(id)`: only future PHs; `planPublicHolidayDelete`.
   - `previewPublicHolidayImpact` and the real operation call the **same** planner, so the preview always matches what happens. Don't write the counting logic twice.
   - **Performance target:** creating a PH for 1,000 users in under 2 seconds locally (large seed). Log the timing.
2. **Tab UI:**
   - Two sections: **Upcoming** (editable) and **Past** (read-only, collapsed by default, grouped by year).
   - Each row shows the date (`formatLong`), name, and "Edit" / "Delete".
   - "Add public holiday" opens a dialog with a name field and a date picker (min today).
   - Every create, edit and delete shows a **confirmation step with the impact preview**: "This applies to every business unit: 214 people will get this holiday. 37 existing bookings will be replaced (parental leave is kept)." It needs an explicit confirm.
   - A clear success toast follows, and the calendar refreshes.
3. **Header markers:** check that the grid header PH chips (T16) update after changes (they will, via `refresh()`).

## Tests (integration, using the default seed plus targeted fixtures)
- Create overwrites AL but keeps PL; creates nothing for OFF days; half PH for AM-only workers; splits blocks; new users created afterwards get it (T12 path).
- Move: untouched copies move (including overwriting on the new date); detached copies stay; people who were OFF on the old date and FULL on the new date get it.
- Delete: untouched copies are removed and detached ones stay.
- Past PH edit or delete → PAST_LOCKED. A plain USER → FORBIDDEN.
- The preview numbers equal the actual applied changes.
- Timing test against the large seed (local / nightly only).
- E2E: an admin adds a PH next month → the confirm shows the impact → the grid shows PH for full-time staff and half for AM-only staff, and the header chip shows the name. Axe on the tab and dialogs.

## Acceptance criteria
- Every spec §6 rule is proven by an integration test; operations are atomic (a failure leaves no partial state).
