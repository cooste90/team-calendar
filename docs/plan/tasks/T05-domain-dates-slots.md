# T05 — Calendar dates, periods, half-day slots and formatting

**Phase:** 1 · **Depends on:** T03 · **Size:** M

## Goal
A rock-solid, time-zone-proof date foundation in `src/domain`. Every other module depends on it.

## Read first
- `01-architecture.md` §3.1, §7
- `00-product-spec.md` §2.2, §5.5

## Deliverables (`src/domain/dates.ts`, `src/domain/slots.ts`, `src/domain/format.ts`)
**dates.ts**
- `type CalendarDate = string // "YYYY-MM-DD"` (a plain alias, no branding).
- `isCalendarDate(s)`: strict `YYYY-MM-DD` that rejects impossible dates such as `2026-02-30`. Export a zod schema `calendarDateSchema` built on it, for URLs, forms and actions.
- `toDayNumber(d)` and `fromDayNumber(n)`, using days since 1970-01-01. Implement with UTC arithmetic.
- `addDays`, `diffDays`, `eachDate(from, to)`. (`"YYYY-MM-DD"` strings already compare correctly with `<` and `>`, so no compare helpers are needed. Say so in a comment.)
- `weekday(d)`: 0 = Sunday … 6 = Saturday.
- `startOfWeek(d)`: the Sunday on or before. `endOfWeek(d)`: Saturday.
- `startOfMonth`, `endOfMonth`, `addMonths` (clamped day), `startOfYear`.
- `nextSunday(d)`: the **strictly next** Sunday (used for "pattern changes apply from next week"). If `d` is a Sunday, it returns `d + 7`.
- `todayIn(timeZone, now = new Date())`: uses `Intl.DateTimeFormat` with `timeZone`. Test it around the BST/GMT changes (last Sunday of March and October) and around midnight.
- `periodRange(view: "week" | "month", anchor)`: returns `{ from, to, days: CalendarDate[] }`. Week is Sun–Sat; month is the 1st to the last day.
- `shiftPeriod(view, anchor, ±1)`.
- `yearOptions(today)`: the current year −5 to +5.
- `weekForMonthSelection(month, year)`: the week containing the 1st (spec §2.1).
- `toDbDate(d): Date` (UTC midnight) and `fromDbDate(date): CalendarDate`. Document that these are the **only** places a JS `Date` meets a calendar date.

**slots.ts**
- `type HalfDay = "AM" | "PM"`, `type Slot = number`
- `toSlot(date, half)` and `fromSlot(slot)` returning `{ date, half }`.
- `type SlotRange = { start: Slot; end: Slot }` (inclusive); `rangeOf({ startDate, startHalf, endDate, endHalf })`.
- `overlaps(a, b)`, `intersect(a, b)`, `subtract(a, b): SlotRange[]` (0, 1 or 2 pieces), `slotsOf(range)`, `datesOf(range)`.
- `isSingleDay(range)` and `portionOf(range)`: for a single day, "FULL", "AM" or "PM".

**format.ts** (en-GB, using `Intl` with `timeZone: "UTC"` on UTC-midnight dates)
- `formatDayHeader(d)` → `"Thu 12"`
- `formatShort(d)` → `"Thu 12 Nov"`
- `formatLong(d)` → `"Thursday 12 November 2026"`
- `formatRangeSummary(range, count)`:
  - `"Thu 12 Nov · 1 day"`
  - `"Thu 12 Nov, morning · 0.5 days"`
  - `"Thu 10 – Tue 15 · 4 days"` (same month: drop the month from the first part)
  - `"Fri 30 Oct – Tue 3 Nov · 3 days"` (months differ)
  - `"Thu 12 PM – Tue 17 · 3.5 days"`
  - `"… – Fri 20 AM · …"` (morning-only last day)
- `formatCount(n)` → `"1 day"`, `"0.5 days"`, `"3.5 days"`, `"0 days"`
- `formatPeriodTitle(view, range)` → `"8 – 14 November 2026"`, `"29 November – 5 December 2026"`, `"27 December 2026 – 2 January 2027"`, `"November 2026"`

## Tests (`src/domain/__tests__/`)
Table-driven, covering:
- Leap years (29 Feb 2028).
- Year boundaries.
- Weeks spanning months and years.
- `nextSunday` on each weekday.
- `todayIn` at 23:30 UTC in BST (the London date is the next day) and at the DST switch.
- `subtract` for every relative position (before, after, inside, covering, partial overlap).
- Every format example above.
- **100% branch coverage.**

## Acceptance criteria
- No `new Date()` in `src/domain` except inside `todayIn` (default parameter) and `toDbDate` / `fromDbDate`.
- The coverage gate passes.

## Out of scope
Availability, events, React.
