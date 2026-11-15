# T19 — Grid performance check with the large seed

**Phase:** 3 · **Depends on:** T18 · **Size:** S

**From T17 and T18 (measure these with the large seed):**
- **Collapse clicks:** each one runs `refresh()` (through `authedAction`), so the server sends the whole BU's data again. `useOptimistic` relies on that refresh. Measure the payload and time for a 300-person BU before deciding whether actions need a way to skip it.
- **Arrow keys:** the focused cell lives in the store and the tab stop is passed down, so each arrow key re-renders `CalendarGrid`, every `TeamGroup` and every `PersonRow` function. The React Compiler should skip the unchanged rows' cells and `buildGridModel`. Check the "Memo ✨" badges in React DevTools and time a key press (an estimate is 1–3 ms). Only if it's slow: `React.memo` on `PersonRow`/`TeamGroup`, or a per-cell store selector.
- **HTML size:** every cell has `data-person`, `data-column` and `tabindex`, which adds roughly 800 KB of uncompressed HTML for a 300-person month. Check the compressed HTML size too, not just the RSC payload. If it matters, `data-person` can move onto the row.

## Goal
Prove the plain grid (no virtualisation) is fast enough with the large seed, using simple CSS and data fixes only. The biggest BU has about 300 people.

## Read first
- `01-architecture.md` §9 (performance without virtualisation)
- `04-code-style.md` (the "don't use" list includes virtualisation libraries)

## Deliverables
1. **CSS containment:** each team group gets `content-visibility: auto` and a `contain-intrinsic-size` matching its row count × row height, so off-screen groups aren't drawn. Check that sticky headers and keyboard focus still work, because focusing a cell must scroll it into view correctly.
2. **Render cost:**
   - Make sure the React Compiler is on for the grid components.
   - Hover effects are CSS only (no state on hover).
   - With React DevTools, check that moving focus re-renders only the affected cells. If it doesn't, read `focusedCell` from the store with a selector in each cell (`useCalendarStore(s => s.focusedCell)`), which is the simple fix.
3. **Data size:** check the page's RSC payload for 300 people × 31 days. If it's over about 300 KB, send availability as one short string per person (e.g. `"OFFFFFO"`) instead of an array. Only do this if the measurement says so.
4. **Budgets** (measure locally with the large seed, `pnpm db:seed:large`):
   - Month view with 300 rows: the page is interactive in under 1 second after navigation.
   - Scrolling has no long tasks over 50ms (Chrome DevTools Performance panel).
   - Arrow-key focus moves feel instant (under 16ms per move).
5. **Only if a budget is missed** after steps 1–3: write the measurement and a proposed fix in `progress.md` as a question for the product owner. Don't add a virtualisation library.

## Tests
- One Playwright perf test (local and nightly only, not on every push) that loads month view with the large seed and asserts the page is interactive within the budget, with some tolerance.

## Acceptance criteria
- The budgets are met locally and recorded in `progress.md`, with machine specs. No new dependencies were added.
