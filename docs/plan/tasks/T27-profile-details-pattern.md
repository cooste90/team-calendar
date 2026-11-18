# T27 — Profile dialog: details and working pattern

**Phase:** 5 · **Depends on:** T26 · **Size:** L

**From T26:** the user menu's "My profile" already links to `?profile=me` (`src/features/calendar/header/user-menu.tsx`). Nothing reads it yet. For the profile header's avatar, `initialsOf` is in `src/domain/display-name.ts`, and the gradient avatar style is `avatarClass` in `user-menu.tsx`. That makes three uses (menu trigger, menu header, profile), so move it into a small shared `src/components/initials-avatar.tsx` then. T30's user rows will need it too.

**Decided with the product owner (2026-11-18):**
1. **Look:** there's no profile screen in the mockup. Match the Add event dialog (width, title, spacing, full screen on phones), with the tabs under the header. Screenshots in light and dark go to the product owner before merging.
2. **A waiting pattern change:** the editor shows the *waiting* pattern, with the notice "Your new pattern starts on Sunday 22 November" ("Priya's new pattern…" for an admin). Otherwise a second save would quietly drop the first change. "Cancel pending change" puts the editor back to the current pattern.
3. **The preview strip:** one small grid-style cell at the end of each day's row, with a morning and an afternoon half. A half that isn't worked is hatched, as on the grid. It's hidden from screen readers, because the radios say the same.
4. **Leave history and Upcoming leave:** hidden until T28 builds them. `?tab=history` or `?tab=upcoming` shows Details until then.

## Goal
"My profile" and the admin's view of anyone's profile, as a modal over the grid with its own URL, covering details and working pattern.

## Read first
- `00-product-spec.md` §4.1, §6.5, §7
- `01-architecture.md` §6.3 (dialogs with their own URL)
- T06 (`planPatternChange`), T08 (`planReconcileForPerson`)

## Deliverables
1. **Opening the dialog (search params, no special routes):**
   - `(app)/page.tsx` checks the `profile` and `person` params. If `profile=me`, or `person=<id>` and `canEditProfileOf(actor, subject)`, it loads that person's profile data (`src/server/queries/profile.ts`) and renders `<ProfileDialog open>` next to the grid.
   - If the actor isn't allowed to see `person=<id>`, ignore the param and show a toast "You can't view that profile". Don't render anything sensitive.
   - Closing the dialog removes the params through nuqs. Opening uses `history: "push"`, so the browser Back button closes it too.
   - The `tab` URL param selects the tab: `details | pattern | history | upcoming`.
2. **`ProfileDialog` shell:**
   - Title "My profile" or "{Name}'s profile". A header with avatar, display name, email, employee number (Geist Mono), BU and team.
   - Tabs: Details, Working pattern, Leave history, Upcoming leave. History and Upcoming are placeholders until T28.
3. **Details tab:**
   - A "Preferred first name" input: optional, 1–40 characters, letters plus space, hyphen and apostrophe (zod), with help text "Shown on the calendar instead of {firstName}". Saving an empty value clears it.
   - Read-only SSO fields with the note "Managed by your organisation's directory".
   - Server action `updatePreferredName(subjectId, value)`.
4. **Working pattern tab:**
   - A 7-row editor (Sun → Sat). Each row is a segmented radiogroup with Full day / Morning / Afternoon / Not working, plus a small visual preview strip.
   - It shows the **current** pattern and, if a change is pending, a notice: "Your new pattern starts on Sunday 15 November", with a "Cancel pending change" action.
   - Save button text: "Save — applies from Sunday 15 November".
   - Server action `updateWorkingPattern(subjectId, pattern)`:
     - `planPatternChange` → upsert the version (convert the 7-item list to the row's `sun … sat` columns in `mappers.ts`);
     - then `planReconcileForPerson(person, futurePHs, effectiveFrom)` → `saveBookingChanges`;
     - all in one transaction, after `lockUsers(tx, [subjectId])`.
   - Cancelling the pending change deletes that version and reconciles again.
   - After saving, `authedAction`'s `refresh()` updates both the dialog and the grid. Show a toast "Working pattern saved. It applies from Sunday 15 November."
5. **Permissions:** self, the BU's admin, or a super admin. Everything is enforced in the actions.

## Tests
- Integration:
  - pattern change creates the version for the next Sunday; saving twice before Sunday replaces it; reconcile adds or removes future PH copies correctly;
  - cancelling pending works;
  - a USER can't update another user;
  - an ADMIN can update someone in their BU but not in another BU.
- Component: the pattern editor radiogroups; the pending notice; validation messages.
- E2E: open My profile from the user menu → the URL has `?profile=me` → change the preferred name → the grid shows the new name after closing → as an admin, open another user from the grid name link → change their pattern → a hard refresh keeps the dialog open → Back closes it. A USER visiting `?person=<someone else>` sees no dialog. Axe on each tab.

## Acceptance criteria
- One `ProfileDialog` component serves both "My profile" and the admin view; the dialog semantics and focus return are correct.

## As built
- **Files:** `src/features/profile/` (`profile-dialog`, `details-tab`, `pattern-tab`, `profile-not-allowed`), `src/server/queries/profile.ts` (`getProfile`), `src/server/services/availability.ts` (`updateWorkingPattern`, `cancelPendingPattern`), `src/server/services/profile.ts` (`updatePreferredName`), three actions, `src/lib/schemas/{profile,availability}.ts`, and the shared `src/components/initials-avatar.tsx`.
- **The page** works out the profile from `?profile=me` or `?person=<id>`. `getProfile` returns null for anyone the viewer can't edit (or who doesn't exist); then the page renders `ProfileNotAllowed`, which shows the toast and removes the param. The browser tab title becomes "My profile · WestCal" or "Priya Shah's profile · WestCal".
- **Closing** (×, Esc, clicking outside) clears `profile`, `person` and `tab` with `history: "replace"`. Switching tabs also replaces, so Back closes the dialog rather than stepping through tabs.
- **Header:** avatar, display name, and "BU · team". The Details tab lists only the SSO fields (name, email, employee number), under "Managed by your organisation's directory". BU and team are set in WestCal, not the directory, so they're only in the header.
- **Saving a pattern** deletes any waiting version and saves the new one (unless it's today's pattern, which just cancels). Then it reconciles the public holidays from next Sunday. `planPatternChange` now compares with today's pattern (see the T06 note).
- **Saved messages** show as a toast and are also read out by an `<output>` inside the dialog: a modal hides the rest of the page, toasts included, from screen readers.
- **Pattern rows** use the shared `SegmentedControl` (a radiogroup per day), which now wraps on narrow screens.
