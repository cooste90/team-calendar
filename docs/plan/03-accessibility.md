# WestCal — Accessibility (WCAG 2.2 AA)

Accessibility is a requirement for **every** task, not just a final audit. Each task's acceptance criteria include "no axe violations" and the keyboard behaviour described here.

## 1. Baseline for every screen
- **Semantic HTML first.** Use real `<button>`, `<a href>`, `<label>` and `<fieldset>`/`<legend>`. Never put an `onClick` on a `div`. One `<h1>` per page (the period title on the calendar). Landmarks: `header` (banner), `main`, `nav` where relevant.
- **Skip link:** "Skip to calendar" as the first focusable element, jumping to the grid (2.4.1).
- **Page `<title>`** reflects the context: "Week of 8 Nov 2026 · West Operations · WestCal", "My profile · WestCal" (2.4.2).
- **Focus:** a visible 2px `--focus` ring with 2px offset on everything (2.4.7). Focus is **never hidden behind** the sticky header, the sticky name column or toasts (2.4.11). The grid scroller sets `scroll-padding-top` and `scroll-padding-left` to the sticky sizes, and focused cells call `scrollIntoView({ block: 'nearest', inline: 'nearest' })`.
- **Focus management:** dialogs trap focus and return it to the element that opened them (Radix does this; verify it). After deleting a booking, focus moves to the cell where it was. After the event form saves, focus returns to the originating cell.
- **Contrast:** text ≥ 4.5:1 and UI component boundaries or states ≥ 3:1 (1.4.3, 1.4.11). Token pairs are enforced by a unit test.
- **Use of colour:** leave types always show a text code. Today and the viewer's row also have non-colour cues: the date pill and the "You" chip (1.4.1).
- **Resize and reflow:** everything is in rem. At **400% zoom (320 CSS px wide)**, the header wraps into rows and lower-priority actions (Key, Export) move into a "More" menu below 720px. Dialogs become full-height sheets that scroll. The **grid may scroll in two directions** (1.4.10 exception for data tables), with names and the header sticky (1.4.4, 1.4.10).
- **Text spacing:** no fixed-height text containers that clip when line-height is 1.5 and letter-spacing 0.12em (1.4.12). Bars truncate with an ellipsis and still expose the full label through the accessible name and tooltip.
- **Hover and focus content:** tooltips, the Key popover and the bar details popover are dismissible (Esc), can be hovered over without disappearing, and stay open until dismissed or until focus leaves (1.4.13).
- **Target size:** pointer targets are ≥ 24×24px (2.5.8). Month-view half bars are narrower, so they are `pointer-events: none` and the cell (≥ 24px) is the target.
- **No dragging anywhere (2.5.7):** team reordering uses Move up / Move down buttons.
- **Consistent help:** the Key is always in the same place in the header (3.2.6).
- **Forms:** visible labels, `aria-describedby` for hints and errors, errors in text next to the field plus a summary on submit (3.3.1, 3.3.3). No redundant re-entry: the form remembers its values after a conflict (3.3.7). Authentication is SSO, with no cognitive test (3.3.8).
- **Status messages:** toasts (sonner) use `role="status"`, and a persistent polite live region (`<LiveRegion>`) announces "Annual leave added for Tom Okafor, Mon 9 to Wed 11 November", "Booking deleted. Undo available" and similar (4.1.3).
- **Motion:** honour `prefers-reduced-motion`. Nothing flashes (2.3.1).
- **Language:** `<html lang="en-GB">`.
- **Forced colours:** see design system §2.2.

## 2. Header controls
- The view toggle is a ToggleGroup with `aria-pressed` and the group labelled "View".
- Previous / Next are icon buttons labelled "Previous week" / "Next month" and so on.
- Month and year are Selects with visible or `aria-label` labels.
- Filter builders: the trigger says "Teams" or "Teams, 2 selected". The popover is a Command listbox with `aria-multiselectable`. Selected chips have "Remove {name}" buttons.
- The Key trigger has `aria-expanded` and opens on hover, focus and click. Its content is a list with headings.
- The user menu is a DropdownMenu (Radix menu semantics). The theme choice is a `menuitemradio` group.

## 3. The grid (ARIA grid pattern)
**Structure:**
- `role="grid"` labelled "Team calendar, week of 8 November 2026". Every row is in the DOM, so screen readers count rows and columns themselves (no `aria-rowcount` needed).
- Header row: `role="row"` containing `role="columnheader"` cells. Each date's accessible name is the full date ("Thursday 12 November, today", "Friday 25 December, public holiday: Christmas Day").
- Team rows: `role="row"` with a single cell spanning the row that holds a **disclosure button** (`aria-expanded`), labelled "Service Design, 6 people, your team".
- Person rows: `role="row"`, with the name as a `role="rowheader"` (a link for admins), then one `role="gridcell"` per **day**.

**Roving tabindex:** only one cell is in the tab order (initially today's cell in the viewer's own row, or the first cell).

| Key | Action |
|---|---|
| ← → | Previous / next day |
| ↑ ↓ | Previous / next person row (team rows are skipped for cell focus but reachable with Tab) |
| Home / End | First / last day in the row |
| Ctrl+Home / Ctrl+End | First / last cell in the grid |
| PageUp / PageDown | Previous / next period (keeps the focused person and weekday) |
| Enter / Space | On an empty cell: open "Add event". On a cell with bookings: open the cell menu (view or edit each booking, add to the free half, set availability override). |
| Delete | If the cell has exactly one editable booking: open the delete confirmation |
| Esc | Close any popover and return focus to the cell |
| ? | Open the keyboard shortcuts help dialog (also reachable from the Key popover) |

- **Cell accessible name** includes the date, person, availability ("not a working day", "morning only") and each booking with its range and count. Bars stay `aria-hidden`, so screen readers aren't given duplicate information.
- **Read-only cells:** if the viewer can't edit that person or date, Enter opens a read-only details view, and the name says "view only".
- **Collapsing a team** keeps focus on its disclosure button. The number of hidden rows is announced.

## 4. Event form dialog
- `role="dialog"` with `aria-modal`, the title "Add event" / "Edit event", and a description "For Tom Okafor · Service Design".
- Type: a radiogroup of cards using arrow keys (Radix RadioGroup).
- Date pickers: the shadcn Calendar (react-day-picker) with full keyboard support, **plus a typed input** that accepts `12/11/2026` or `12 Nov 2026`, so keyboard users don't have to use the calendar.
- Duration and halves: radiogroups.
- The range summary is a live region (polite).
- The conflict alert has `role="alert"` and its actions are buttons. Focus moves to the alert when it appears.
- Notes: a textarea with a counter announced politely only once 80% of the limit is reached.

## 5. Testing checklist (T35 runs all of these; each feature task covers its own part)
- [ ] Axe (Playwright) on: sign-in, dev sign-in, welcome, calendar week, calendar month, event form (add, edit, conflict), details popover, key popover, filters, user menu, profile (each tab), admin (each tab), confirm dialogs. Both themes.
- [ ] Keyboard-only e2e: book a multi-day leave, edit it, delete it, undo; filter teams; change theme; open the profile; reorder a team with buttons.
- [ ] Zoom: viewport 1280×800 at 200% and 400% equivalent (640 and 320 CSS px): no lost functionality, and no horizontal page scroll outside the grid.
- [ ] Forced colours: Playwright `forcedColors: 'active'` screenshots of grid and dialogs.
- [ ] Reduced motion: Playwright `reducedMotion: 'reduce'`, checking no animation classes are applied.
- [ ] Manual screen-reader pass with NVDA + Firefox/Chrome and Narrator + Edge (the meeting-room machines run Windows). Record the results in `docs/a11y-report.md`.
