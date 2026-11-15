# T18 — Grid keyboard navigation and screen-reader model

**Phase:** 3 · **Depends on:** T17 · **Size:** M

**From T16:**
- The grid's scroll box (`calendar-grid.tsx`) has `tabIndex={0}` so keyboard users can scroll it. Remove that once the roving tabindex puts a cell in the tab order.
- Point the "Skip to calendar" link (`(app)/layout.tsx`, currently `#main`) at the focusable cell.

**From T17:**
- Team rows hold a real `<button>` (`team-group-row.tsx`), and admins' name cells hold a `<Link>` (`person-row.tsx`). Both are in the Tab order today. Decide how the name link fits the roving tabindex (e.g. the rowheader link stays tabbable, or arrows reach the rowheader and Enter follows the link) and test it.
- Collapse/expand already announces "Service Design collapsed, 6 people hidden." through the live region.

## Goal
The grid is fully usable with a keyboard and a screen reader, following the ARIA grid pattern in `03-accessibility.md` §3.

## Read first
- `03-accessibility.md` §1 (focus not obscured), §3 (all of it)
- WAI-ARIA Authoring Practices: Data Grid pattern

## Deliverables
1. **Focus model:** add `focusedCell: { personId, date }` to the calendar store (`src/features/calendar/calendar-store.ts`). *(As built: `{ personId, column }`, where the column is a date or the admins' name column.)*
   - Exactly one gridcell has `tabIndex=0` (roving tabindex). The others have −1.
   - Initial focus: the viewer's row × today if visible, else the first person × first day.
   - When filters, collapse or period changes remove the focused cell, focus moves to the nearest valid cell.
2. **Key handling** on the grid container (one delegated `onKeyDown` with a plain `switch`), with every binding from the table in `03-accessibility.md` §3. Put the "which cell is next" maths in a pure, unit-tested function `nextCell(model, current, key)` in its own file, `src/domain/grid-navigation.ts` (`grid-model.ts` is already at the ~200-line guide), so the component stays short:
   - **PageUp and PageDown** change the period, then keep the same person and weekday once the new data arrives.
   - **Enter, Space and Delete** dispatch a `cellActivate` / `cellDelete` event that T25 handles. For now, Enter shows a toast "Booking actions arrive in T25" behind a dev flag, or does nothing. *(As built: nothing yet; T25 adds them to the hook's `switch`.)*
3. **Accessible names:** gridcells use `aria-label` from the model's `accessibleLabel`. The column header's date is exposed through `aria-describedby` only if the screen reader testing shows it's needed (avoid doubled reading). Team disclosure buttons stay in the Tab order. **Tab moves out of the grid**, as the grid pattern expects.
4. **Focus visibility:**
   - The focused cell shows a 2px inset ring.
   - `scrollIntoView({ block: "nearest", inline: "nearest" })` on focus change.
   - `scroll-padding-top` = header height and `scroll-padding-left` = name column width, so sticky areas never hide focus (2.4.11).
5. **Announcements:** on period change, announce "Week of 8 to 14 November 2026" through the live region. On team collapse, announce "Service Design collapsed, 6 people hidden".
6. **Keyboard help:** a dialog listing every grid and header shortcut, opened with `?` (when the grid has focus) and from the Key popover (T20 links to it). It is a simple shadcn Dialog with a definition list.

## Tests
- Component (user-event): every key binding moves focus correctly, including across team boundaries, collapsed groups and filtered rows; Home/End; Ctrl+Home/End; PageDown triggers the period change and the same weekday stays focused afterwards.
- E2E: keyboard-only, starting at the skip link → into the grid → arrow to Friday in a teammate's row → press Enter (handled in T25; here just assert the event fires) → Tab out to the next control.
- Manual: a quick NVDA check that cell names read naturally. Note the findings in `progress.md`.

## Acceptance criteria
- Every grid interaction available to a mouse is reachable from the keyboard (by T25, when actions exist).
- Axe has no violations; no focus is lost after a data refetch.
