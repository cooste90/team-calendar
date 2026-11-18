# T06 — Working patterns, overrides, availability and day counting

**Phase:** 1 · **Depends on:** T05 · **Size:** M

## Goal
Pure functions that answer "is this person working on this half-day?" and "how many working days does this booking cover?"

## Read first
- `00-product-spec.md` §4, §5.2
- `01-architecture.md` §3 (WorkingPattern, AvailabilityOverride)

## Deliverables (`src/domain/availability.ts`, `src/domain/counting.ts`)
- `type WorkDay = "FULL" | "AM" | "PM" | "OFF"`
- `type WeeklyPattern = WorkDay[]`: 7 entries, index = weekday, 0 = Sunday (as built: a plain list instead of a `Record`)
- `DEFAULT_PATTERN`: Sun OFF, Mon–Fri FULL, Sat OFF. `DEFAULT_PATTERN_EFFECTIVE_FROM = "2000-01-02"` (a Sunday).
- `type PatternVersion = { effectiveFrom: CalendarDate; pattern: WeeklyPattern }`
- `type Override = { date: CalendarDate; value: WorkDay }`
- `availabilityLookup(versions, overrides): (date) => WorkDay` (as built: replaces the planned `resolveAvailability` and `availabilityForRange`): the override if present, else the latest version with `effectiveFrom ≤ date`, else `DEFAULT_PATTERN`. It sorts the versions once, so it's cheap to call for every cell.
- `worksSlot(workDay, half)`: FULL → both halves; AM → AM only; PM → PM only; OFF → neither.
- `countWorkingDays(range: SlotRange, availabilityLookup): number`: 0.5 per working slot.
- `workingSlots(range, lookup)` and `nonWorkingSlots(range, lookup)`, used for hatching inside bars and for "not counted" hints.
- `describeExcludedDays(range, lookup)`: a short human hint for the form, e.g. `"Sat 14 and Sun 15 are not working days, so they are not counted."`, `"Wed 11 is a morning-only day."`, or `""` if nothing was excluded.
- `planPatternChange(versions, newPattern, today)`: returns the version to upsert, `{ effectiveFrom: nextSunday(today), pattern }`. If a version already exists for that Sunday it is replaced. Returns `null` if the new pattern equals the pattern that would be in force from that Sunday anyway. *(Changed in T27: `null` now means "the same as the pattern in force today", so saving today's pattern again cancels a pending change.)*

## Tests
These spec examples **must** each be a named test:
- Thu+Fri-only worker booking Thu → Tue counts **2**.
- AM-only Wednesday, Mon–Fri booking counts **4.5**.
- Single AM booking on a PM-only day counts **0**.
- A booking entirely on OFF days counts **0**.
- An override of FULL on a Saturday makes a Sat booking count 1.
- An override of OFF on a Monday removes it from the count.
- Pattern history: a pattern changed from 2026-06-07 doesn't change counts for May.
- `planPatternChange` on each weekday picks the right Sunday; saving twice before Sunday replaces the pending version.
- 100% branch coverage.

## Out of scope
Persistence and UI.
