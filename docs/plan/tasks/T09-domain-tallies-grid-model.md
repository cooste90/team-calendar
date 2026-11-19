# T09 — Tallies and the grid view-model

**Phase:** 1 · **Depends on:** T08 · **Size:** M

## Goal
Pure functions for profile tallies and for turning raw calendar data into exactly what the grid renders.

## Read first
- `00-product-spec.md` §2.3, §3, §7
- `01-architecture.md` §9
- `03-accessibility.md` §3 (accessible names)
- Mockup "App" artboard (bars, clipping, hatching)

## Deliverables
### `src/domain/tallies.ts`
- `tallyWindows(today)`:
  - AL: `{ from: startOfYear(today), to: endOfYear }`
  - rolling: `{ from: addDays(addMonths(today, −12), 1), to: today }`
- `computeTallies(bookings, availabilityLookup, today)` returns a list in display order, `{ type, taken, booked? }[]` (as built), with:
  - `ANNUAL: { taken, booked }`, where taken = days on dates ≤ today within the year and booked = days after today until 31 Dec;
  - `SPECIAL`, `PARENTAL`, `WELLBEING`, `PUBLIC_HOLIDAY`: `{ taken }` over the rolling window.
  - **Changed in T28:** the product owner corrected `PUBLIC_HOLIDAY` to the calendar year, like `ANNUAL` (`{ taken, booked }`). It's one setting in `leave-types.ts`.
  - Untallied types (FL, SK, OT, WFH) are excluded.
  - A booking that crosses a window edge counts **only the slots inside it**.
- `historyGroups(bookings, today)`: past bookings inside each tallied window, grouped by type, newest first.
- `upcomingBookings(bookings, today)`: bookings with end ≥ today, sorted by start (an ongoing booking appears here, flagged as ongoing).

### `src/domain/grid-model.ts`
- **Input:**
  - `view`, `range` (from T05), `today`
  - `viewer { id, teamId, canSeeUnassigned, canEdit(subject) }`
  - `teams[] { id, name, sortOrder }`
  - `people[] { id, firstName, preferredName, surname, teamId, availability: AvailabilityLookup }` (as built: a lookup, because bar counts cover days outside the visible period). The input and output types are in `src/domain/grid-model-types.ts`.
  - `bookings[]`, `publicHolidays[]`
  - `collapsedTeamIds`, `filters { teamIds[], personIds[] }`
- **Output `GridModel`:**
  - `columns`: one per day `{ date, gridColumn, isToday, header: { weekdayShort, dayNumber, accessibleLabel, publicHolidayName? } }`
  - `groups`: in order. The viewer's team comes first, then the others by sortOrder, then Unassigned if `canSeeUnassigned`. Each group is `{ id | "unassigned", name, isViewerTeam, isUnassigned, memberCount, collapsed, rows[] }`.
  - **row:** `{ personId, displayName, isViewer, canEdit, cells[], bars[], offOverlays[] }`, sorted by surname then display first name (`Intl.Collator('en-GB')`).
  - **cell:** `{ date, gridColumn: "a / span 2", availability, isToday, bookings: BookingSummary[], accessibleLabel }`
  - **bar:** `{ bookingId, type, code, gridColumn: "start / span n", label ("AL", or "AL · 4 days" when it covers more than one day), clippedStart, clippedEnd, isHalf, isNarrow /* true in month view for half bars */, title /* full description */ }`
  - **offOverlay:** `{ gridColumn }` for non-working slots strictly inside multi-day bars.
- **Filters:** a person is shown if no filters are set, or their team is in `teamIds`, or they are in `personIds` (union). Empty groups are dropped when filters are active.
- **Accessible label format** (from `03-accessibility.md` §3), e.g. `"Thursday 12 November, Tom Okafor, not a working day. Annual leave, Monday 9 to Wednesday 11 November, 3 days."`
- **Performance:** O(people × days + bookings). Benchmark test: 300 people × 31 days with 3,000 bookings builds in < 25ms (Vitest bench or a timed test with a generous CI margin).

## Tests
- Tallies:
  - an AL booking crossing 31 Dec → split between years;
  - rolling-window edge dates;
  - half days give 0.5;
  - untallied types are ignored.
- Grid:
  - clipping on both sides (a booking spans the whole visible week);
  - half bars get the correct gridColumn (AM = even track, PM = odd track);
  - hatched slots inside a bar;
  - viewer team pinned;
  - Unassigned hidden for users;
  - collapsed group has no rows;
  - union filters;
  - PH name on the header;
  - surname sort with accents (Ó, É).
- 100% branch coverage.

## Out of scope
React components.
