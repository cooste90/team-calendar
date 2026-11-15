# T16 — Grid rendering: week and month, bars, hatching, today, PH markers

**Phase:** 3 · **Depends on:** T15 · **Size:** L

## Goal
A read-only calendar grid that looks like the mockup, driven entirely by `buildGridModel` (T09).

## Read first
- `00-product-spec.md` §2.2, §2.3, §5.6
- `01-architecture.md` §9
- `02-design-system.md` §5, §6. Mockup "App" (toggle week and month, light and dark) and "Palette" (cell patterns).
- `03-accessibility.md` §3 (the structure only; keyboard comes in T18)

## Deliverables (`src/features/calendar/grid/`)
1. **`CalendarGrid`** (client): receives the `getCalendarData` result as a prop from `(app)/page.tsx` and calls `buildGridModel(...)`. The React Compiler handles memoising, so no `useMemo`.
   - From T14: each person arrives with `patterns` and `overrides`, so build `availability: availabilityLookup(person.patterns, person.overrides)`. Build `viewer.canEdit` from the plain `viewer` with `(person) => canEditBookingsFor(viewer, person)`. Functions can't be passed from the server page to a client component.
   - It renders a scroll container (`overflow: auto`, `max-height: calc(100dvh - header)`, `scroll-padding` for sticky areas) holding:
     - `GridHeaderRow`: a sticky top row with a sticky corner cell. `DayHeader` shows the weekday, the date (the today pill), and a PH name chip with a tooltip.
     - per group, `TeamGroupRow`: a simple non-collapsing header in this task (T17 adds collapse).
     - per person, `PersonRow`: a sticky `rowheader` name cell; `GridCell` × days (a button-like gridcell, but with no actions yet); `GridBar` × bars; `OffOverlay` × overlays.
   - CSS grid per row: `grid-template-columns: var(--name-col) repeat(N, minmax(0, 1fr))`, with N = days × 2. Each row is its own grid with the same template (as in the mockup), so columns line up.
   - **Month view:** compact sizes (design system §5) and `isNarrow` half bars with `pointer-events: none`.
   - **Hatching** for OFF, AM-only and PM-only availability; **today column** tint; **viewer row** tint, "You" chip and crosshair cell.
2. **`GridBar`:** colour tokens by type, label with ellipsis, square clipped edges, a `title`/tooltip with the full description, and `aria-hidden="true"` (cells carry the accessible information).
3. **Replace the T14 placeholder** with the grid. Because the page loads data on the server, the first paint already shows the grid.
4. **Loading states:** `(app)/loading.tsx` shows shape-matched skeleton rows for the very first load. Between periods, the dimmed grid from T15 (`isPending`) is enough.
5. **View switch:** the grid fades in over 150ms (the `fade-in` CSS class), turned off by the global reduced-motion rule.
6. **Theming:** check both themes against the mockup. Forced-colors styles from the design system.

## Tests
- Component (with fixture models):
  - week view renders 7 column headers with the right labels;
  - a half AM bar sits in the even track and PM in the odd track;
  - a clipped bar has square edges (class / data attribute);
  - an OFF cell has the hatch class;
  - the today column cells have `data-today`;
  - the viewer row has `data-viewer`;
  - month view renders 28–31 headers;
  - a PH name chip appears.
  - axe with no violations (the structure roles exist: grid, row, columnheader, rowheader, gridcell).
- E2E (seeded): sign in as a seeded user → the current week is visible with today highlighted → switch to month → bars visible → screenshots (light and dark) attached to the MR for visual comparison with the mockup.

## Acceptance criteria
- Visual parity with the mockup "App" artboard (spacing, colours, radii, typography) in both views and themes.
- No layout shift when the data loads (CLS ≈ 0 in a Lighthouse local run).

## Out of scope
Collapse persistence and admin links (T17), keyboard (T18), performance check (T19), interactions (T25).
