# T15 — App shell and header navigation

**Phase:** 3 · **Depends on:** T14 · **Size:** M

## Goal
The header bar from the mockup, with working period navigation, the BU switcher and view preference. Slots are left for the features built later.

## Read first
- `00-product-spec.md` §2.1, §2.2
- `02-design-system.md` §3–§4. Mockup "App" artboard (header row and the sub-header with the period title).
- `03-accessibility.md` §1, §2
- `node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md`

## Deliverables
1. **`(app)/layout.tsx`:**
   - `requireUser()`, skip link (the theme and tooltip providers are already in the root layout from T04) "Skip to calendar", `<header>` and `<main id="main">`.
   - Call `useRefreshOnFocus()` (T14) once, in a small client component here.
2. **`features/calendar/header/`:**
   - `Brand` (logo and wordmark, links to `/` with today's period).
   - `BusinessUnitSwitcher`: a Select, shown only when `getVisibleBusinessUnits` returns more than one. It updates `bu` in the URL and resets filters.
   - `ViewToggle` (SegmentedControl): updates `view` and calls `setViewPreference`.
   - `PeriodNav`: Previous, Month Select, Year Select (±5 years), Next and Today. Labels change with the view ("Previous week"). Month and year selection in week view follows `weekForMonthSelection`.
   - **Placeholder slots** (rendering nothing for now) for Filters (T21), Key (T20), Export (T33) and UserMenu (T26). Keep the layout stable so later tasks drop components in.
3. **Sub-header:** an `<h1>` period title (`formatPeriodTitle`) and a context line ("West Operations · all teams · all people", or the filter summary later).
4. **Document title:** through `generateMetadata` using the period and BU (e.g. "Week of 8 Nov 2026 · West Operations · WestCal").
5. **Navigation feel:**
   - Period, view and BU changes update the URL through nuqs with `shallow: false` inside `startTransition`, so the server re-renders the page with new data (architecture §6.1). While `isPending`, dim the grid area to 60% and show a thin progress bar under the header.
   - No prefetching or client caching. Keep it simple.
6. **Responsive and zoom:**
   - The header wraps cleanly.
   - Below 720px of available width, the right-hand cluster (Key, Export) collapses into a "More" DropdownMenu. Use **CSS container queries** to show one or the other (no JavaScript measuring).
   - Test at 320 CSS px.
7. **Keyboard shortcuts:** Alt+T (today), Alt+W / Alt+M (view), Alt+[ and Alt+] (previous and next).
   - One `keydown` listener in one small hook, with a plain `switch` on the key.
   - Using Alt means WCAG 2.1.4 is met without a settings screen. Note this in a comment.

## Tests
- Component: PeriodNav computes the right anchors; the month dropdown in week view jumps to the week containing the 1st; year options span ±5.
- E2E: change view → reload → the same view opens (cookie); Prev/Next updates the title and the URL; the BU switcher is hidden for a single-BU user and visible for a super admin; axe in both themes; zoom 320px → no horizontal page scroll and every control reachable through "More".

## Acceptance criteria
- The header matches the mockup and is fully keyboard operable, with a logical tab order (left to right).
