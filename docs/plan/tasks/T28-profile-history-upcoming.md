# T28 — Leave history tallies and upcoming leave

**Phase:** 5 · **Depends on:** T27 · **Size:** M

**From T27:** the dialog is `src/features/profile/profile-dialog.tsx`. It only shows Details and Working pattern: `?tab=history` and `?tab=upcoming` fall back to Details (see `const tab = …`). Add the two `TabsTrigger`/`TabsContent` pairs there and let the tab through. `getProfile` in `src/server/queries/profile.ts` already does the permission check and is `cache()`d, so `getProfileLeave` can sit next to it. The page calls `getOpenProfile` (in `src/app/(app)/page.tsx`) for the profile.

## Goal
The two read-only profile tabs: tallies with their supporting bookings, and the upcoming list.

## Read first
- `00-product-spec.md` §3, §7
- T09 (`computeTallies`, `historyGroups`, `upcomingBookings`). `computeTallies` returns a list in display order, `{ type, taken, booked? }[]`, so the cards just map over it.

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

## Decided with the product owner
- **No seed fixture.** The seed is random and relative to today, and its public holidays cut into bookings, so fixed expected numbers would be fragile. The component tests prove the exact numbers instead (hand-written bookings run through the real `leaveSummary`). The e2e test checks a seeded person's tabs have the right shape, plus axe.
- **Past bookings are in `<details>` sections, one per type, closed at first,** so the tally cards stay in view.
- **Upcoming leave lists every type,** WFH included, as the spec says "future bookings".

## As built
- **`leaveSummary(bookings, lookup, today)`** (`src/domain/tallies.ts`) works out everything the two tabs show:
  - `history`: one entry per tallied type, as the tally (`computeTallies`, now with its `window`) plus the past bookings behind it, each with its working days;
  - `upcoming`: bookings from today on, under month headings. Leave that has already started goes under this month and is marked ongoing.
- **`getProfileLeave(actor, userId, today)`** (`src/server/queries/profile.ts`) asks `getProfile` for the permission (cached, so free) and returns null when it says no. It loads the bookings from the rolling window's start (never later than 1 January) to two years ahead, plus all the person's patterns and day swaps. The page loads it whenever a profile is open, so switching tabs is instant.
- **`HistoryTab` and `UpcomingTab`** (`src/features/profile/`) only display. The tally cards are a `<dl>` (title, numbers, window dates). Each line uses the new `formatRangeWithMonth`, "Wed 19 – Thu 20 Nov · 2 days". The booking form's `formatRangeSummary` leaves the month off within one month, which is fine under the form's date fields but not in a list.
- **Line tabs wrap onto a second row** on narrow screens (`src/components/ui/tabs.tsx`, `line` variant). Four tabs don't fit in one row on a phone.
- **New formatters:** `formatDateWindow` ("1 Jan – 31 Dec 2026"), `formatMonthYear` ("November 2026", now also used by the month view's titles) and `formatBookings` ("3 bookings").
