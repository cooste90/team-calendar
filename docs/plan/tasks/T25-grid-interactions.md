# T25 — Grid interactions, grow animation and undo

**Phase:** 4 · **Depends on:** T24 · **Size:** L

**From T18:**
- Enter, Space and Delete aren't handled yet. Add them as cases in the `switch` in `src/features/calendar/grid/use-grid-keyboard.ts`, and list them in `shortcuts-help-dialog.tsx`.
- Each cell carries `data-person` and `data-column` (the date); the store's `focusedCell` is the last focused cell.
- Every `DialogContent` (`src/components/ui/dialog.tsx`) returns focus to whatever had it when it opened, so a dialog opened from a cell goes back to that cell. AlertDialog doesn't do this yet; give `alert-dialog.tsx` the same few lines when the delete confirmation needs it.
- If a booking change removes the focused cell, `use-grid-keyboard.ts` puts focus back on the tab stop.

**From T23:** the actions for the details popover and toasts are ready:
- `deleteBookingAction({ id })` returns `{ booking, publicHolidayId }`. Pass it unchanged to `restoreBookingAction` for the toast's Undo.
- If Undo fails with `CONFLICT`, show its message ("Couldn't undo — something else is booked there now.").
- `removeBookingDayAction({ id, date })` and `trimBookingAction({ id })` are the other two.

## Goal
Bring the grid to life. Clicking a cell books, clicking a bar shows details, a new booking grows into place, and every action has a keyboard path. All of it uses the simple pattern: **call the action → it calls `refresh()` → the grid shows the new data.**

## Read first
- `00-product-spec.md` §2.5, §5.5, §5.6
- `01-architecture.md` §6.2 (writes, undo)
- `02-design-system.md` §6 (booking grow)
- `03-accessibility.md` §3 (Enter / Delete behaviour), §1 (focus management, status messages)
- `04-code-style.md`

## Deliverables
1. **Cell activation** (mouse click or Enter / Space from T18):
   - **Empty cell, editable:** open `EventFormDialog` (create) for that person and date.
   - **Cell with bookings, or a read-only cell:** open a **cell menu** (Popover anchored to the cell) listing each booking (chip, type, range, "View" / "Edit"), "Add to morning" / "Add to afternoon" when a half is free, and "Set availability for this day" when permitted.
   - **Read-only viewers:** the menu shows "View" only.
   - **Unassigned viewers** can't create.
2. **Bar click:** opens `EventDetailsPopover` anchored to the bar, showing:
   - chip, type, range summary, count;
   - notes;
   - "Created by … · when", "Last changed by … · when";
   - actions per permission: **Edit**, **Delete**, **Remove this day** (only for multi-day; the date is where the user clicked, or a date select inside the popover), **Delete remaining days** (ongoing).
   - It is dismissible with Esc, and focus returns to the cell that owns that date.
3. **Calling actions:** components call the T22/T23 server actions directly inside `startTransition`, and show a pending state while they run. On `{ ok: false }`, show a toast with the message. For CONFLICT, reopen the form with the conflict alert. There's no client cache to update: the action's `refresh()` brings the new data.
4. **Grow animation:**
   - After a successful create, store the new booking id as `lastCreatedId` in the calendar store.
   - `GridBar` adds the `animate-grow` class when its id equals `lastCreatedId`, then clears it on `animationend`. That's the whole mechanism.
   - The global reduced-motion CSS rule turns it off. Edits don't animate.
5. **Delete flow:**
   - A confirmation AlertDialog for multi-day bookings ("Delete Annual leave, Mon 9 – Wed 11 Nov (3 days)?"). A single-day delete from the popover happens immediately.
   - Then a toast "Booking deleted" with **Undo** for 8 seconds. The delete action returns the deleted booking, and Undo passes it to `restoreBookingAction`.
   - Live region announcements for every successful action, for example "Annual leave added for Tom Okafor, Mon 9 to Wed 11 November, 3 days".
6. **Focus management:** after create or edit, focus goes to the originating cell. After delete, focus goes to the cell. After undo, focus goes to the restored booking's first cell.
7. **Keyboard Delete** on a focused cell with exactly one editable booking: the same delete flow.
8. **Other people's changes** arrive through `useRefreshOnFocus` (T14). Check that a booking created in another browser appears on refocus (e2e with two contexts).

## Tests
- Component: the cell menu content for the various cell states; the details popover actions follow permissions; a failed action shows the error toast (mock action).
- E2E (seeded):
  - book a multi-day AL by clicking a cell → the bar grows → the label shows "AL · N days" → reload → it persists;
  - book AM AL and PM FL on the same day → split cell;
  - a conflict → Replace;
  - edit an ongoing booking's end date;
  - remove a middle day → two bars;
  - delete → Undo;
  - keyboard-only version of the first flow;
  - teammate permissions (can edit a teammate, can't edit another team: no edit actions shown);
  - a second browser context sees the change after a focus event.
- Axe with the popovers and menus open.

## Acceptance criteria
- Every spec §5 interaction works end-to-end with mouse **and** keyboard; the UI never shows a stale state after an error.
- No client-side copy of booking data exists outside the props from the server.
