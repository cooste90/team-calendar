# T28 — Leave history tallies and upcoming leave

**Phase:** 5 · **Depends on:** T27 · **Size:** M

## Goal
The two read-only profile tabs: tallies with their supporting bookings, and the upcoming list.

## Read first
- `00-product-spec.md` §3, §7
- T09 (`computeTallies`, `historyGroups`, `upcomingBookings`)

## Deliverables
1. **Query `getProfileLeave(actor, subjectId, today)`** in `src/server/queries/profile.ts`:
   - Returns the subject's bookings from `min(startOfYear, today − 12 months)` to `max(endOfYear, +∞ for upcoming)`. Cap upcoming at 2 years ahead.
   - Also returns availability versions and overrides for counting.
   - Permission: `canEditProfileOf`.
2. **Leave history tab:**
   - **Tally cards**:
     - "Annual leave · 2026" → "12.5 days taken · 6 days booked";
     - "Special leave · last 12 months" → "2 days";
     - Parental leave, Wellbeing days and Public holidays in the same format.
   - Each card shows the window dates in small text ("1 Jan – 31 Dec 2026", "13 Nov 2025 – 12 Nov 2026").
   - Below the cards: an accordion or sections per type listing the past bookings in that window (range summary, count, notes snippet), newest first.
   - Empty states per type.
   - A note: "Flexi, sickness, other and working-from-home aren't tallied."
3. **Upcoming leave tab:**
   - A list of bookings with end ≥ today, sorted by start, grouped by month heading.
   - Each item shows the chip, type, range summary, count, notes, and an "Ongoing" badge if it started in the past. It is **read-only** (no actions).
   - Hint: "To change a booking, use the calendar."
4. **Semantics:** tally cards are a `<dl>` with clear labels; lists are `<ul>` with headings; counts use tabular numerals.

## Tests
- Integration: the query returns the right windows; the permission check.
- Component: tallies render the right numbers for fixture data (an AL crossing the year boundary, half days, rolling-window edges); upcoming is read-only (no buttons); empty states.
- E2E: a seeded user with known bookings shows the expected tallies (the seed exports a fixture with expected numbers for one person); axe.

## Acceptance criteria
- Numbers match the domain functions exactly. The UI does no counting maths of its own.
