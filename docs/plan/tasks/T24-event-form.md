# T24 — Add / edit event dialog

**Phase:** 4 · **Depends on:** T23 · **Size:** L

## Goal
The booking form from the mockup's "Add / edit event dialog" artboard: fast, clear and accessible.

## Read first
- `00-product-spec.md` §4.2, §5.5
- `02-design-system.md` §7 (TypeRadioCard, RangeSummary, ConflictAlert), §8 (copy)
- `03-accessibility.md` §4
- Mockup "EventDialog" (try the range, conflict, edit and theme tweaks)
- The shadcn Dialog, RadioGroup, Calendar (react-day-picker) and Field docs
- `04-code-style.md` (no form library)

## Deliverables (`src/features/calendar/event-form/`)
1. **`EventFormDialog`** (opened through `eventDialog: { mode: "create" | "edit", subjectId, date | bookingId } | null` in the calendar store):
   - **Title:** "Add event" / "Edit event". **Description:** "For {display name} · {team}".
   - **Type:** a radiogroup of 9 `TypeRadioCard`s in a 3-column grid, defaulting to AL for create.
   - **Start date** and **End date:** `DatePickerField`, a text input that accepts `12/11/2026`, `12 Nov 2026` or `2026-11-12`, plus a calendar popover button. The minimum date is `earliestCreatableDate`. In the picker, non-working days for the subject are shown with hatching, using the availability the grid already has for the visible period. Outside that period, show the picker without hatching; don't fetch extra data.
   - **Defaults:** start = the clicked date, end = **the same day**. If the start moves past the end, the end follows the start.
   - **Duration** (single day): Full day / Morning (AM) / Afternoon (PM).
   - **First day / Last day** (multi-day): Full day | Afternoon only, and Full day | Morning only. Switching between single and multi-day keeps sensible values (FULL by default).
   - **RangeSummary** (`aria-live="polite"`): `formatRangeSummary` plus the `describeExcludedDays` hint, computed **client-side** from the subject's availability.
   - **Notes:** a textarea with a 500-character limit and counter ("Everyone in the business unit can see notes.").
   - **Availability override** section, shown only when the clicked date is a non-working day (or working day) for the subject and the actor can edit the subject's profile:
     - checkbox "I'm working this day" with Full / AM / PM, or "I'm not working this day";
     - wording changes to "{Name} is working this day" when an admin edits someone else;
     - saved through `setAvailabilityOverride` before the booking (or on its own if no booking is entered: allow saving **just** the override).
   - **Edit mode:** prefilled. Fields not in `allowedEdits` are disabled, with a reason ("Started in the past — only the end date and notes can change"). The footer shows Delete, and for ongoing bookings "Delete remaining days". Also a meta block: "Created by X · date time", "Last changed by Y · date time" (or "a deleted user").
   - **Conflict:** when the server returns CONFLICT, show `ConflictAlert` (`role="alert"`, focused) with each clash message, plus **Replace it** and **Change dates** (focuses the start date). Replace re-submits with `replace: true`. The form keeps all its values (3.3.7).
   - **Form state:** keep the form values in one `useState` object (type, dates, halves, notes). On submit, validate with the shared `bookingInputSchema` (T07) using `safeParse`, then call `createBookingAction` / `updateBookingAction` inside `startTransition`. Errors show inline with `aria-describedby`, plus a summary on submit failure. The submit button shows the pending state. On success, the dialog closes and focus returns to the originating cell. The action's `refresh()` updates the grid.
   - The server validates again with the same schema, so the rules are written once.
2. **Responsive:** at narrow widths and high zoom it becomes a full-height sheet with scrollable content and a sticky footer.
3. **Keep it short:** split the dialog into a few small components (`TypePicker`, `DateRangeFields`, `OverrideFields`, `ConflictAlert`) in the same folder, each in its own file.

## Tests (component)
- Defaults (end = start); end follows start; Duration is only visible for a single day, First/Last only for multi-day; the summary updates live with the correct counts using a fixture availability (the spec examples).
- Disabled fields for an ongoing booking; the minimum date for USER vs ADMIN.
- Conflict alert flow: Replace re-submits with the flag; values are kept.
- Override section visibility rules.
- axe with no violations in create, edit, conflict and narrow layouts; keyboard: Tab order, radiogroup arrows, date input typing.

## Acceptance criteria
- Visual parity with the mockup dialog in both themes; works at 400% zoom.
